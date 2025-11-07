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

    // Get orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        currency: {
          select: {
            symbol: true,
          },
        },
      },
    });

    // Get orders requiring attention
    const requiresAttention = await prisma.order.count({
      where: {
        ...where,
        OR: [
          { status: "ON_HOLD" },
          { paymentStatus: "FAILED" },
          { priority: "URGENT" },
        ],
      },
    });

    return NextResponse.json({
      ordersByStatus,
      recentOrders,
      requiresAttention,
    });
  } catch (error) {
    console.error("Get order dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order dashboard data" },
      { status: 500 }
    );
  }
}
