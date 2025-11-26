import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Validation schemas based on actual PricingTier model
const pricingTierCreateSchema = z.object({
  merchantId: z.string().uuid().optional().nullable(), // Null for system-wide defaults
  serviceType: z.string().min(1), // e.g., "WAREHOUSING_MONTHLY", "FULFILLMENT_PER_ORDER"
  baseRate: z.number().min(0),
  negotiatedRate: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional(), // Optional percentage discount
  rateUnit: z.string().min(1), // e.g., "PER_UNIT_MONTH", "PER_ORDER"
  currency: z.string().default("USD"),
  minimumOrderQuantity: z.number().optional(),
  maximumOrderQuantity: z.number().optional(),
  features: z.string().optional(),
  applicableRegions: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

const pricingTierUpdateSchema = z.object({
  merchantId: z.string().uuid().optional().nullable(),
  serviceType: z.string().min(1).optional(),
  baseRate: z.number().min(0).optional(),
  negotiatedRate: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  rateUnit: z.string().min(1).optional(),
  currency: z.string().optional(),
});

// GET /api/admin/pricing-tiers - List all pricing tiers
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can manage pricing tiers
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can access pricing tier management" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const merchantId = searchParams.get("merchantId");
    const serviceType = searchParams.get("serviceType");

    const offset = (page - 1) * limit;

    // Build filters
    let whereClause: any = {};
    if (merchantId) {
      whereClause.merchantId = merchantId;
    }
    if (serviceType) {
      whereClause.serviceType = serviceType;
    }

    // Get pricing tiers
    const [pricingTiers, totalCount] = await Promise.all([
      prisma.pricingTier.findMany({
        where: whereClause,
        include: {
          Business: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ serviceType: "asc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
      }),
      prisma.pricingTier.count({ where: whereClause }),
    ]);

    // Get distinct service types for summary
    const serviceTypes = await prisma.pricingTier.findMany({
      select: { serviceType: true },
      distinct: ['serviceType'],
    });

    return NextResponse.json({
      pricingTiers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalTiers: totalCount,
        systemWideTiers: await prisma.pricingTier.count({
          where: { ...whereClause, merchantId: null },
        }),
        merchantSpecificTiers: await prisma.pricingTier.count({
          where: { ...whereClause, merchantId: { not: null } },
        }),
        serviceTypes: serviceTypes.map(st => st.serviceType),
      },
    });

  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/pricing-tiers - Create new pricing tier
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can create pricing tiers
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create pricing tiers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = pricingTierCreateSchema.parse(body);

    // Validate merchant exists if merchantId provided
    if (validatedData.merchantId) {
      const merchant = await prisma.business.findUnique({
        where: { id: validatedData.merchantId },
        select: { id: true, name: true },
      });

      if (!merchant) {
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }
    }

    // Check for existing tier with same merchant/service combination
    const existingTier = await prisma.pricingTier.findFirst({
      where: {
        merchantId: validatedData.merchantId,
        serviceType: validatedData.serviceType,
      },
    });

    if (existingTier) {
      return NextResponse.json(
        { error: `Pricing tier for service type "${validatedData.serviceType}" already exists${validatedData.merchantId ? " for this merchant" : " as system default"}` },
        { status: 409 }
      );
    }

    // Create the pricing tier
    const createData: any = { ...validatedData };
    if (typeof validatedData.merchantId !== 'string') {
      delete createData.merchantId;
    }
    if (typeof validatedData.discountPercent !== 'number') {
      delete createData.discountPercent;
    }
    const newPricingTier = await prisma.pricingTier.create({
      data: createData,
      include: {
        Business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });


    

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "PricingTier",
        entityId: newPricingTier.id,
        action: "CREATE",
        details: {
          createdTier: validatedData,
        },
        changedById: authResult.user.id,
        timestamp: new Date(),
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json(newPricingTier, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating pricing tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}