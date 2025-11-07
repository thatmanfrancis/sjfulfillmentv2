import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching stats` }, { status: 400 });
  }

  try {
    const { id } = await params;
    // Get stats
    const [
      totalOrders,
      totalRevenue,
      totalProducts,
      totalCustomers,
      pendingOrders,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.count({
        where: { merchantId: id },
      }),
      prisma.order.aggregate({
        where: {
          merchantId: id,
          paymentStatus: "PAID",
        },
        _sum: { totalAmount: true },
      }),
      prisma.product.count({
        where: {
          merchantId: id,
          deletedAt: null,
        },
      }),
      prisma.customer.count({
        where: {
          merchantId: id,
          deletedAt: null,
        },
      }),
      prisma.order.count({
        where: {
          merchantId: id,
          status: "PENDING",
        },
      }),
      prisma.inventory.count({
        where: {
          product: {
            merchantId: id,
          },
          quantityAvailable: {
            lte: prisma.inventory.fields.reorderPoint,
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalProducts,
        totalCustomers,
        pendingOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
