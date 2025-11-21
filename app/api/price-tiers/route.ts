import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const createPricingTierSchema = z.object({
  merchantId: z.string().uuid().optional(),
  serviceType: z.string(),
  baseRate: z.number().positive(),
  negotiatedRate: z.number().positive(),
  rateUnit: z.string(),
  currency: z.string().length(3),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create pricing tiers
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can create pricing tiers" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPricingTierSchema.parse(body);

    // If merchantId is provided, check if merchant exists
    if (validatedData.merchantId) {
      const merchant = await prisma.business.findUnique({
        where: { id: validatedData.merchantId },
        select: { id: true }
      });
      if (!merchant) {
        return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
      }
    }

    const newTier = await prisma.pricingTier.create({
      data: {
        id: crypto.randomUUID(),
        merchantId: validatedData.merchantId,
        serviceType: validatedData.serviceType,
        baseRate: validatedData.baseRate,
        negotiatedRate: validatedData.negotiatedRate,
        rateUnit: validatedData.rateUnit,
        currency: validatedData.currency,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ pricingTier: newTier, message: "Pricing tier created successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating pricing tier:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optionally filter by merchantId
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const where = merchantId ? { merchantId } : {};
    const tiers = await prisma.pricingTier.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ pricingTiers: tiers });
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
