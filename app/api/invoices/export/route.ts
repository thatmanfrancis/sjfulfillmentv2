import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while exporting invoices` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const status = searchParams.get("status");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        currency: true,
      },
    });

    // Convert to CSV
    const headers = [
      "Invoice Number",
      "Customer",
      "Status",
      "Total Amount",
      "Amount Due",
      "Currency",
      "Due Date",
      "Issue Date",
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      `${inv.customer.firstName} ${inv.customer.lastName}`,
      inv.status,
      inv.totalAmount,
      inv.amountDue,
      inv.currency.code,
      inv.dueDate.toISOString().split("T")[0],
      inv.issueDate.toISOString().split("T")[0],
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=invoices.csv",
      },
    });
  } catch (error) {
    console.error("Export invoices error:", error);
    return NextResponse.json(
      { error: "Failed to export invoices" },
      { status: 500 }
    );
  }
}
