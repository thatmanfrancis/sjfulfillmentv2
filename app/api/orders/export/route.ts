import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const status = searchParams.get("status");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      deletedAt: null,
    };

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        currency: true,
      },
    });

    // Convert to CSV
    const headers = [
      "Order Number",
      "Customer",
      "Email",
      "Status",
      "Payment Status",
      "Total Amount",
      "Currency",
      "Order Date",
    ];

    const rows = orders.map((order: any) => [
      order.orderNumber,
      `${order.customer.firstName} ${order.customer.lastName}`,
      order.customer.email,
      order.status,
      order.paymentStatus,
      order.totalAmount,
      order.currency.code,
      order.orderDate.toISOString().split("T")[0],
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=orders.csv",
      },
    });
  } catch (error) {
    console.error("Export orders error:", error);
    return NextResponse.json(
      { error: "Failed to export orders" },
      { status: 500 }
    );
  }
}
