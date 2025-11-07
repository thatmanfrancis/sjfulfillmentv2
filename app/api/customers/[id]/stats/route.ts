import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching customer statistics` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const [
      totalOrders,
      totalSpent,
      averageOrderValue,
      lastOrderDate,
      pendingInvoices,
    ] = await Promise.all([
      prisma.order.count({
        where: { customerId: id },
      }),
      prisma.order.aggregate({
        where: {
          customerId: id,
          paymentStatus: "PAID",
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          customerId: id,
          paymentStatus: "PAID",
        },
        _avg: { totalAmount: true },
      }),
      prisma.order.findFirst({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.invoice.count({
        where: {
          customerId: id,
          status: { in: ["SENT", "VIEWED", "OVERDUE"] },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalOrders,
        totalSpent: totalSpent._sum.totalAmount || 0,
        averageOrderValue: averageOrderValue._avg.totalAmount || 0,
        lastOrderDate: lastOrderDate?.createdAt || null,
        pendingInvoices,
      },
    });
  } catch (error) {
    console.error("Get customer stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer statistics" },
      { status: 500 }
    );
  }
}
