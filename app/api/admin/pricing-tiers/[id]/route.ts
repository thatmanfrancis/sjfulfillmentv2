import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const pricingTierUpdateSchema = z.object({
  merchantId: z.string().uuid().optional().nullable(),
  serviceType: z.string().min(1).optional(),
  baseRate: z.number().min(0).optional(),
  negotiatedRate: z.number().min(0).optional(),
  rateUnit: z.string().min(1).optional(),
  currency: z.string().optional(),
});

// GET /api/admin/pricing-tiers/[id] - Get specific pricing tier details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can view pricing tier details
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can access pricing tier details" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const tierId = resolvedParams.id;

    // Get pricing tier with usage data
    const pricingTier = await prisma.pricingTier.findUnique({
      where: { id: tierId },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            contactPhone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!pricingTier) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    // Calculate usage statistics based on invoice data
    const usageStats = await prisma.invoice.findMany({
      where: {
        merchantId: pricingTier.merchantId || undefined,
        status: "PAID",
      },
      select: {
        storageCharges: true,
        fulfillmentFees: true,
        receivingFees: true,
      },
    });

    const totalUsage = usageStats.reduce((sum, invoice) => {
      return sum + (invoice.storageCharges || 0) + (invoice.fulfillmentFees || 0) + (invoice.receivingFees || 0);
    }, 0);

    return NextResponse.json({
      ...pricingTier,
      usage: {
        totalInvoices: usageStats.length,
        totalRevenue: totalUsage,
        isSystemDefault: !pricingTier.merchantId,
      },
    });

  } catch (error) {
    console.error("Error fetching pricing tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pricing-tiers/[id] - Update pricing tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can update pricing tiers
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update pricing tiers" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const tierId = resolvedParams.id;
    const body = await request.json();
    const validatedData = pricingTierUpdateSchema.parse(body);

    // Get existing pricing tier
    const existingTier = await prisma.pricingTier.findUnique({
      where: { id: tierId },
      include: {
        Business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingTier) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    // Validate merchant if changing merchantId
    if (validatedData.merchantId && validatedData.merchantId !== existingTier.merchantId) {
      const business = await prisma.business.findUnique({
        where: { id: validatedData.merchantId },
        select: { id: true, name: true },
      });

      if (!business) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate service type if changing service type or merchant
    if (validatedData.serviceType || validatedData.merchantId !== undefined) {
      const newServiceType = validatedData.serviceType || existingTier.serviceType;
      const newMerchantId = validatedData.merchantId !== undefined ? validatedData.merchantId : existingTier.merchantId;
      
      const duplicate = await prisma.pricingTier.findFirst({
        where: {
          merchantId: newMerchantId,
          serviceType: newServiceType,
          id: { not: tierId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Pricing tier for service type "${newServiceType}" already exists${newMerchantId ? " for this merchant" : " as system default"}` },
          { status: 409 }
        );
      }
    }

    // Update the pricing tier
    const updatedTier = await prisma.pricingTier.update({
      where: { id: tierId },
      data: validatedData,
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
        entityId: tierId,
        action: "UPDATE",
        details: {
          previousValues: {
            merchantId: existingTier.merchantId,
            serviceType: existingTier.serviceType,
            baseRate: existingTier.baseRate,
            negotiatedRate: existingTier.negotiatedRate,
            rateUnit: existingTier.rateUnit,
            currency: existingTier.currency,
          },
          newValues: validatedData,
          changedFields: Object.keys(validatedData),
        },
        changedById: authResult.user.id,
        timestamp: new Date(),
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json(updatedTier);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating pricing tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing-tiers/[id] - Delete pricing tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can delete pricing tiers
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete pricing tiers" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const tierId = resolvedParams.id;

    // Get existing pricing tier
    const existingTier = await prisma.pricingTier.findUnique({
      where: { id: tierId },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingTier) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    // Check if tier is being used in any invoices
    const relatedInvoices = await prisma.invoice.findMany({
      where: {
        merchantId: existingTier.merchantId || undefined,
      },
      select: { id: true, billingPeriod: true },
      take: 5,
    });

    if (relatedInvoices.length > 0) {
      return NextResponse.json({
        error: "Cannot delete pricing tier that has been used for billing",
        relatedInvoices: relatedInvoices.length,
        suggestion: "Consider archiving instead of deleting",
      }, { status: 409 });
    }

    // Delete the pricing tier
    await prisma.pricingTier.delete({
      where: { id: tierId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "PricingTier",
        entityId: tierId,
        action: "DELETE",
        details: {
          deletedTier: {
            id: existingTier.id,
            merchantId: existingTier.merchantId,
            serviceType: existingTier.serviceType,
            baseRate: existingTier.baseRate,
            negotiatedRate: existingTier.negotiatedRate,
            rateUnit: existingTier.rateUnit,
            currency: existingTier.currency,
          },
        },
        changedById: authResult.user.id,
        timestamp: new Date(),
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json({
      message: "Pricing tier deleted successfully",
      deletedTier: {
        id: existingTier.id,
        serviceType: existingTier.serviceType,
        merchantName: existingTier.Business?.name || "System Default",
      },
    });

  } catch (error) {
    console.error("Error deleting pricing tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}