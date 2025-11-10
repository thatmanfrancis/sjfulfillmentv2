import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

// GET /api/commissions - Fetch commission data for all merchants
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const merchantId = url.searchParams.get("merchantId");

    // Build where clause
    const where = merchantId ? { merchantId } : {};

    // Fetch merchant balances with merchant details
    const [merchantBalances, total] = await Promise.all([
      prisma.merchantBalance.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              businessEmail: true,
              businessPhone: true,
            },
          },
          remittances: {
            orderBy: { remittanceDate: "desc" as const },
            take: 5,
            select: {
              id: true,
              amount: true,
              remittanceDate: true,
              paymentMethod: true,
              referenceNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" as const },
      }),
      prisma.merchantBalance.count({ where }),
    ]);

    // Get merchant settings to fetch commission rates
    const merchantSettings = await prisma.merchantSetting.findMany({
      where: {
        merchantId: {
          in: merchantBalances.map((mb) => mb.merchantId),
        },
        key: "commissionRate",
      },
      select: {
        merchantId: true,
        value: true,
      },
    });

    const settingsMap = new Map(
      merchantSettings.map((s) => [s.merchantId, s.value as number])
    );

    // Format response
    const commissions = merchantBalances.map((balance) => {
      const commissionRate = settingsMap.get(balance.merchantId) || 0.15; // Default 15%
      const platformFee = balance.totalCollected * commissionRate;
      const merchantEarnings = balance.totalCollected - platformFee;

      return {
        id: balance.id,
        merchant: balance.merchant,
        totalCollected: balance.totalCollected,
        totalRemitted: balance.totalRemitted,
        pendingBalance: balance.pendingBalance,
        platformFee,
        merchantEarnings,
        commissionRate,
        lastRemittanceAt: balance.lastRemittanceAt,
        recentRemittances: balance.remittances,
      };
    });

    return NextResponse.json({
      commissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch commissions", details: error.message },
      { status: 500 }
    );
  }
}
