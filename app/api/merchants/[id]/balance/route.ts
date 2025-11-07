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
      { message: `Error occurred while fetching merchant balance` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    // Get or create balance
    const balance = await prisma.merchantBalance.upsert({
      where: { merchantId: id },
      create: {
        merchantId: id,
        totalCollected: 0,
        totalRemitted: 0,
        pendingBalance: 0,
      },
      update: {},
      include: {
        remittances: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            processor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get recent collections
    const recentCollections = await prisma.orderPaymentCollection.findMany({
      where: {
        order: {
          merchantId: id,
        },
      },
      take: 10,
      orderBy: { collectedAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        collector: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      balance,
      recentCollections,
    });
  } catch (error) {
    console.error("Get merchant balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant balance" },
      { status: 500 }
    );
  }
}
