import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z } from "zod";


const createPricingTierSchema = z.object({
  serviceType: z.string().min(1, "Service type is required").max(100),
  baseRate: z.number().min(0, "Base rate must be positive"),
  negotiatedRate: z.number().min(0, "Negotiated rate must be positive"),
  rateUnit: z.string().min(1, "Rate unit is required"),
  currency: z.string().default("USD"),
  merchantId: z.string().optional(), // Allow admin to specify merchant
});

const updatePricingTierSchema = createPricingTierSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    // Get all pricing tiers with business count
    const pricingTiers = await prisma.pricingTier.findMany({
      include: {
        Business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform the data to include business count
    const transformedTiers = pricingTiers.map((tier) => ({
      id: tier.id,
      name: tier.serviceType, // Use serviceType as name
      description: `${tier.rateUnit} pricing`,
      baseRate: tier.baseRate,
      ratePerKg: tier.negotiatedRate, // Map negotiated rate to per kg rate
      ratePerKm: tier.baseRate * 0.5, // Simple calculation for per km
      minimumCharge: tier.baseRate,
      isActive: true, // All tiers are active since no isActive field
      businessCount: tier.Business ? 1 : 0, // Since it's a one-to-one relationship
      createdAt: tier.createdAt.toISOString(),
      updatedAt: tier.updatedAt.toISOString(),
    }));

    // Calculate stats
    const totalTiers = transformedTiers.length;
    const activeTiers = transformedTiers.filter((t) => t.isActive).length;
    const averageBaseRate =
      totalTiers > 0
        ? transformedTiers.reduce((sum, tier) => sum + tier.baseRate, 0) /
          totalTiers
        : 0;
    const totalBusinessesUsingTiers = transformedTiers.reduce(
      (sum, tier) => sum + tier.businessCount,
      0
    );

    return NextResponse.json({
      pricingTiers: transformedTiers,
      stats: {
        totalTiers,
        activeTiers,
        averageBaseRate,
        totalBusinessesUsingTiers,
      },
    });
  } catch (error) {
    console.error("Get pricing tiers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { description, currency, merchantId, packages } = body;
    if (!Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json(
        { error: "At least one package is required." },
        { status: 400 }
      );
    }

    // Validate and create each package
    const createdTiers = [];
    const errors = [];
    for (const pkg of packages) {
      const mappedPkg = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        serviceType: pkg.serviceType,
        baseRate:
          typeof pkg.baseRate === "string"
            ? parseFloat(pkg.baseRate)
            : pkg.baseRate,
        negotiatedRate:
          typeof pkg.negotiatedRate === "string"
            ? parseFloat(pkg.negotiatedRate)
            : pkg.negotiatedRate,
        rateUnit: pkg.rateUnit || "per_kg",
        currency: currency || "USD",
        merchantId: merchantId || null,
        updatedAt: new Date(),
      };
      const result = createPricingTierSchema.safeParse(mappedPkg);
      if (!result.success) {
        errors.push({
          serviceType: pkg.serviceType,
          error: result.error?.issues || [],
        });
        continue;
      }
      // Check for duplicates
      const exists = await prisma.pricingTier.findFirst({
        where: {
          merchantId: mappedPkg.merchantId,
          serviceType: {
            equals: mappedPkg.serviceType,
            mode: "insensitive",
          },
        },
      });
      if (exists) {
        errors.push({
          serviceType: pkg.serviceType,
          error: "Tier already exists for this service type.",
        });
        continue;
      }
      // Create tier
      const created = await prisma.pricingTier.create({
        data: mappedPkg,
      });
      createdTiers.push({ id: created.id, serviceType: created.serviceType });
    }

    if (createdTiers.length === 0) {
      return NextResponse.json(
        { error: "No tiers created.", details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, created: createdTiers, errors },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create pricing tier error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
