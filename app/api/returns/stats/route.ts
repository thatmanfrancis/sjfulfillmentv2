import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching returns statistics` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (merchantId) {
      where.order = { merchantId };
    } else if (!isAdmin) {
      where.order = { merchantId: { in: merchantIds } };
    }

    const [
      totalReturns,
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      refundedReturns,
      totalRefundAmount,
    ] = await Promise.all([
      prisma.return.count({ where }),
      prisma.return.count({ where: { ...where, status: "REQUESTED" } }),
      prisma.return.count({ where: { ...where, status: "APPROVED" } }),
      prisma.return.count({ where: { ...where, status: "REJECTED" } }),
      prisma.return.count({ where: { ...where, status: "REFUNDED" } }),
      prisma.return.aggregate({
        where: { ...where, status: "REFUNDED" },
        _sum: { refundAmount: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalReturns,
        pendingReturns,
        approvedReturns,
        rejectedReturns,
        refundedReturns,
        totalRefundAmount: totalRefundAmount._sum.refundAmount || 0,
        returnRate:
          totalReturns > 0
            ? ((totalReturns / (totalReturns + 100)) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    console.error("Get return stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return statistics" },
      { status: 500 }
    );
  }
}
