import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while fetching stats` },
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
      totalCalls,
      verifiedCalls,
      noAnswerCalls,
      cancelledCalls,
      rescheduledCalls,
      averageDuration,
    ] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.count({ where: { ...where, outcome: "VERIFIED" } }),
      prisma.callLog.count({ where: { ...where, outcome: "NO_ANSWER" } }),
      prisma.callLog.count({ where: { ...where, outcome: "CANCELLED" } }),
      prisma.callLog.count({ where: { ...where, outcome: "RESCHEDULED" } }),
      prisma.callLog.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalCalls,
        verifiedCalls,
        noAnswerCalls,
        cancelledCalls,
        rescheduledCalls,
        verificationRate:
          totalCalls > 0 ? ((verifiedCalls / totalCalls) * 100).toFixed(2) : 0,
        averageDuration: Math.round(averageDuration._avg.duration || 0),
      },
    });
  } catch (error) {
    console.error("Get call log stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call log statistics" },
      { status: 500 }
    );
  }
}
