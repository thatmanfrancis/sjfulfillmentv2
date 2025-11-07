import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while getting call call logs` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const outcome = searchParams.get("outcome");
    const merchantId = searchParams.get("merchantId");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    // Filter by merchant
    if (merchantId) {
      where.order = { merchantId };
    } else if (!isAdmin) {
      where.order = { merchantId: { in: merchantIds } };
    }

    if (outcome) {
      where.outcome = outcome;
    }

    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { callDate: "desc" },
        include: {
          order: {
            select: {
              orderNumber: true,
              merchant: {
                select: {
                  businessName: true,
                },
              },
            },
          },
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          caller: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.callLog.count({ where }),
    ]);

    return NextResponse.json({
      callLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get call logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 }
    );
  }
}
