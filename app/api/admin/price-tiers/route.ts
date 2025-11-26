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
  merchantId: z.string().optional(),
  discountPercent: z.number().optional(),
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

    // Get all price tier groups and their children
    const groups = await prisma.priceTierGroup.findMany({
      include: {
        pricingTiers: {
          include: {
            Business: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format response: each group is a card, with its offerings/packages as an array
    const priceTiers = groups.map(group => {
      const offerings = group.pricingTiers.map(tier => ({
        id: tier.id,
        serviceType: tier.serviceType,
        baseRate: tier.baseRate,
        negotiatedRate: tier.negotiatedRate,
        rateUnit: tier.rateUnit,
        currency: tier.currency,
        discountPercent: tier.discountPercent,
        createdAt: tier.createdAt,
        updatedAt: tier.updatedAt,
        Business: tier.Business,
      }));
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        offerings,
        totalBaseRate: offerings.reduce((sum, o) => sum + (o.baseRate || 0), 0),
        totalNegotiatedRate: offerings.reduce((sum, o) => sum + (o.negotiatedRate || 0), 0),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      };
    });

    return NextResponse.json({
      priceTiers,
      stats: {
        totalGroups: priceTiers.length,
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
        console.log("[PriceTier] Invalid packages payload:", body);
      return NextResponse.json(
        { error: "At least one package is required." },
        { status: 400 }
      );
    }

    // Validate and create each package
    const createdTiers = [];
    const errors = [];
    for (const pkg of packages) {
      let mappedPkg = {
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
        merchantId: merchantId ? merchantId : undefined,
        discountPercent:
          pkg.discountPercent !== undefined && pkg.discountPercent !== ""
            ? Number(pkg.discountPercent)
            : undefined,
        updatedAt: new Date(),
      };
      // Remove any extra fields not in schema
        Object.keys(mappedPkg).forEach(key => {
          const allowed = [
            "id",
            "serviceType",
            "baseRate",
            "negotiatedRate",
            "rateUnit",
            "currency",
            "merchantId",
            "discountPercent",
            "updatedAt"
          ];
          if (!allowed.includes(key)) {
            delete mappedPkg[key as keyof typeof mappedPkg];
          }
        });
      // Remove undefined fields
        Object.keys(mappedPkg).forEach(key => {
          const k = key as keyof typeof mappedPkg;
          if (mappedPkg[k] === undefined) {
            delete mappedPkg[k];
          }
        });
      const result = createPricingTierSchema.safeParse(mappedPkg);
      if (!result.success) {
          console.log("[PriceTier] Validation failed:", mappedPkg, result.error?.issues);
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
        console.log("[PriceTier] No tiers created. Errors:", errors, "Payload:", body);
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
