import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching summary` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const [balance, collectionsThisPeriod, remittancesThisPeriod] =
      await Promise.all([
        prisma.merchantBalance.findUnique({
          where: { merchantId: id },
        }),
        prisma.orderPaymentCollection.aggregate({
          where: {
            order: { merchantId: id },
            ...(Object.keys(dateFilter).length && { collectedAt: dateFilter }),
          },
          _sum: { amountCollected: true },
          _count: true,
        }),
        prisma.remittance.aggregate({
          where: {
            merchantId: id,
            ...(Object.keys(dateFilter).length && {
              remittanceDate: dateFilter,
            }),
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    return NextResponse.json({
      summary: {
        currentBalance: balance?.pendingBalance || 0,
        totalCollected: balance?.totalCollected || 0,
        totalRemitted: balance?.totalRemitted || 0,
        collectionsThisPeriod: {
          amount: collectionsThisPeriod._sum.amountCollected || 0,
          count: collectionsThisPeriod._count,
        },
        remittancesThisPeriod: {
          amount: remittancesThisPeriod._sum.amount || 0,
          count: remittancesThisPeriod._count,
        },
        lastRemittanceAt: balance?.lastRemittanceAt || null,
      },
    });
  } catch (error) {
    console.error("Get balance summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance summary" },
      { status: 500 }
    );
  }
}
