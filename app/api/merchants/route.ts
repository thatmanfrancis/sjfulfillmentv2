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
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Get user context including role and merchant access
    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // If not admin, only show their merchants
    if (!isAdmin) {
      if (merchantIds.length === 0) {
        // User has no merchant access
        return NextResponse.json({
          merchants: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }
      where.id = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { businessEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
          subscriptionPlan: {
            select: {
              name: true,
              billingCycle: true,
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              customers: true,
            },
          },
        },
      }),
      prisma.merchant.count({ where }),
    ]);

    return NextResponse.json({
      merchants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get merchants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchants" },
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
    const body = await req.json();
    const {
      businessName,
      businessEmail,
      businessPhone,
      ownerUserId,
      currencyId,
      timezone,
      logoUrl,
      websiteUrl,
      taxId,
      subscriptionPlanId,
    } = body;

    if (!businessName || !businessEmail || !ownerUserId || !currencyId) {
      return NextResponse.json(
        {
          message:
            `Business name, email, owner user ID, and currency are required ${!businessName ? "businessName " : ""}${!businessEmail ? "businessEmail " : ""}${!ownerUserId ? "ownerUserId " : ""}${!currencyId ? "currencyId " : ""}`.trim(),
        },
        { status: 400 }
      );
    }

    // Check if owner exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerUserId },
    });

    if (!owner) {
      return NextResponse.json(
        { error: "Owner user not found" },
        { status: 404 }
      );
    }

    // Check if currency exists
    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      );
    }

    const merchant = await prisma.merchant.create({
      data: {
        businessName,
        businessEmail,
        businessPhone,
        ownerUserId,
        currencyId,
        timezone: timezone || "UTC",
        logoUrl,
        websiteUrl,
        taxId,
        subscriptionPlanId,
        createdBy: auth.userId as string,
        status: "TRIAL",
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        currency: true,
      },
    });

    return NextResponse.json(
      {
        message: "Merchant created successfully",
        merchant,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create merchant error:", error);
    return NextResponse.json(
      { error: "Failed to create merchant" },
      { status: 500 }
    );
  }
}
