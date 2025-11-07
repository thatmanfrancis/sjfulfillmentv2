import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while merging customers` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { primaryCustomerId, duplicateCustomerIds } = body;

    if (!primaryCustomerId || !Array.isArray(duplicateCustomerIds)) {
      return NextResponse.json(
        {
          error:
            "Primary customer ID and duplicate customer IDs array are required",
        },
        { status: 400 }
      );
    }

    // Get primary customer
    const primaryCustomer = await prisma.customer.findUnique({
      where: { id: primaryCustomerId },
    });

    if (!primaryCustomer) {
      return NextResponse.json(
        { error: "Primary customer not found" },
        { status: 404 }
      );
    }

    // Merge orders, payments, invoices, addresses to primary customer
    await Promise.all([
      prisma.order.updateMany({
        where: { customerId: { in: duplicateCustomerIds } },
        data: { customerId: primaryCustomerId },
      }),
      prisma.payment.updateMany({
        where: { customerId: { in: duplicateCustomerIds } },
        data: { customerId: primaryCustomerId },
      }),
      prisma.invoice.updateMany({
        where: { customerId: { in: duplicateCustomerIds } },
        data: { customerId: primaryCustomerId },
      }),
      prisma.address.updateMany({
        where: { customerId: { in: duplicateCustomerIds } },
        data: { customerId: primaryCustomerId },
      }),
    ]);

    // Delete duplicate customers
    await prisma.customer.deleteMany({
      where: { id: { in: duplicateCustomerIds } },
    });

    // Recalculate stats for primary customer
    const stats = await prisma.order.aggregate({
      where: {
        customerId: primaryCustomerId,
        paymentStatus: "PAID",
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    await prisma.customer.update({
      where: { id: primaryCustomerId },
      data: {
        lifetimeValue: stats._sum.totalAmount || 0,
        orderCount: stats._count,
      },
    });

    return NextResponse.json({
      message: `Successfully merged ${duplicateCustomerIds.length} customer(s) into primary customer`,
    });
  } catch (error) {
    console.error("Merge customers error:", error);
    return NextResponse.json(
      { error: "Failed to merge customers" },
      { status: 500 }
    );
  }
}
