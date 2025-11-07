import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching dashboard overview` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");

    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    // Get role-specific data
    const isLogistics = userRole === "LOGISTICS_PERSONNEL";

    const [
      todayOrders,
      pendingOrders,
      totalRevenue,
      lowStockItems,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          ...where,
          orderDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.count({
        where: {
          ...where,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      }),
      prisma.order.aggregate({
        where: {
          ...where,
          paymentStatus: "PAID",
        },
        _sum: { totalAmount: true },
      }),
      prisma.inventory.count({
        where: {
          product: merchantId
            ? { merchantId }
            : !isAdmin
            ? { merchantId: { in: merchantIds } }
            : {},
          quantityAvailable: {
            lte: prisma.inventory.fields.reorderPoint,
          },
          reorderPoint: { not: null },
        },
      }),
      prisma.order.findMany({
        where: isLogistics ? { assignedTo: auth.userId as string } : where,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      overview: {
        todayOrders,
        pendingOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        lowStockItems,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get dashboard overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard overview" },
      { status: 500 }
    );
  }
}
