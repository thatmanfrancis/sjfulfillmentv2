import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const merchantId = searchParams.get("merchantId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Build merchant filter
    let merchantFilter: any = {};
    if (!isAdmin) {
      merchantFilter = { id: { in: merchantIds } };
    } else if (merchantId) {
      merchantFilter = { id: merchantId };
    }

    // Get merchant balances with pagination
    const skip = (page - 1) * limit;
    
    const [balances, totalCount] = await Promise.all([
      prisma.merchantBalance.findMany({
        where: {
          merchant: merchantFilter
        },
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              businessEmail: true
            }
          },
          remittances: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              processor: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.merchantBalance.count({
        where: {
          merchant: merchantFilter
        }
      })
    ]);

    // Calculate commission rates (this would typically come from merchant settings)
    const enrichedBalances = balances.map(balance => {
      const commissionRate = 0.025; // 2.5% platform fee
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
        recentRemittances: balance.remittances.map(rem => ({
          id: rem.id,
          amount: rem.amount,
          date: rem.remittanceDate,
          method: rem.paymentMethod,
          reference: rem.referenceNumber,
          processedBy: `${rem.processor.firstName} ${rem.processor.lastName}`
        })),
        createdAt: balance.createdAt,
        updatedAt: balance.updatedAt
      };
    });

    return NextResponse.json({
      balances: enrichedBalances,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error("Error fetching commission balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission balances" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { merchantId, amount, paymentMethod, referenceNumber, notes } = await req.json();

    const { isAdmin } = await getUserMerchantContext(auth.userId as string);
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can process payouts" }, { status: 403 });
    }

    // Find merchant balance
    const balance = await prisma.merchantBalance.findUnique({
      where: { merchantId },
      include: { merchant: true }
    });

    if (!balance) {
      return NextResponse.json({ error: "Merchant balance not found" }, { status: 404 });
    }

    if (amount > balance.pendingBalance) {
      return NextResponse.json(
        { error: "Payout amount exceeds pending balance" },
        { status: 400 }
      );
    }

    // Process payout
    await prisma.$transaction(async (tx) => {
      // Create remittance record
      await tx.remittance.create({
        data: {
          merchantBalanceId: balance.id,
          merchantId,
          amount,
          remittanceDate: new Date(),
          paymentMethod,
          referenceNumber,
          notes,
          processedBy: auth.userId as string
        }
      });

      // Update merchant balance
      await tx.merchantBalance.update({
        where: { id: balance.id },
        data: {
          totalRemitted: { increment: amount },
          pendingBalance: { decrement: amount },
          lastRemittanceAt: new Date()
        }
      });
    });

    return NextResponse.json({
      message: "Payout processed successfully",
      amount,
      merchant: balance.merchant.businessName
    });
  } catch (error) {
    console.error("Error processing payout:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 }
    );
  }
}