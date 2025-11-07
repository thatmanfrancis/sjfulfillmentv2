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

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      pendingPayments,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: "PENDING" } }),
      prisma.order.count({ where: { ...where, status: "PROCESSING" } }),
      prisma.order.count({ where: { ...where, status: "SHIPPED" } }),
      prisma.order.count({ where: { ...where, status: "DELIVERED" } }),
      prisma.order.count({ where: { ...where, status: "CANCELLED" } }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: "PENDING" },
        _sum: { totalAmount: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        pendingPayments: pendingPayments._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order statistics" },
      { status: 500 }
    );
  }
}
