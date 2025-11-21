import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateMerchantPricingSchema = z.object({
  pricingTierId: z.string().uuid('Invalid pricing tier ID'),
  customRates: z.object({
    baseRate: z.number().min(0, 'Base rate must be positive').optional(),
    negotiatedRate: z.number().min(0, 'Negotiated rate must be positive').optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const merchantId = id;

    // Verify merchant exists
    const merchant = await prisma.business.findUnique({
      where: { id: merchantId },
      select: { 
        id: true, 
        name: true,
        isActive: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get merchant's current pricing tiers
    const merchantPricing = await prisma.pricingTier.findMany({
      where: { 
        OR: [
          { merchantId: merchantId }, // Merchant-specific tiers
          { merchantId: null }       // System-wide tiers
        ]
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all available pricing tiers for assignment
    const allPricingTiers = await prisma.pricingTier.findMany({
      where: { merchantId: null }, // Only system-wide tiers
      orderBy: { serviceType: 'asc' },
    });

    return NextResponse.json({
      merchant,
      currentPricing: merchantPricing.map((tier: any) => ({
        id: tier.id,
        name: tier.priceTier.name,
        description: tier.priceTier.description,
        baseCost: tier.priceTier.baseCost,
        weightCost: tier.priceTier.weightCost,
        distanceCost: tier.priceTier.distanceCost
      })),
      availableTiers: allPricingTiers.map((tier: any) => ({
        id: tier.id,
        serviceType: tier.serviceType,
        baseRate: tier.baseRate,
        negotiatedRate: tier.negotiatedRate,
        rateUnit: tier.rateUnit,
        currency: tier.currency,
      })),
    });

  } catch (error) {
    console.error('Get merchant pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const merchantId = id;
    const body = await request.json();

    // Verify merchant exists
    const merchant = await prisma.business.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    const { serviceType, baseRate, negotiatedRate, rateUnit, currency } = body;

    // Create custom pricing tier for merchant
    const customPricing = await prisma.pricingTier.create({
      data: {
        id: `pricing_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        merchantId,
        serviceType,
        baseRate: parseFloat(baseRate),
        negotiatedRate: parseFloat(negotiatedRate),
        rateUnit: rateUnit || 'per_kg',
        currency: currency || 'USD',
        updatedAt: new Date()
      },
    });

    return NextResponse.json({
      id: customPricing.id,
      serviceType: customPricing.serviceType,
      baseRate: customPricing.baseRate,
      negotiatedRate: customPricing.negotiatedRate,
      rateUnit: customPricing.rateUnit,
      currency: customPricing.currency,
      isCustom: true,
      createdAt: customPricing.createdAt.toISOString(),
      updatedAt: customPricing.updatedAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Create merchant pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const merchantId = id;
    const body = await request.json();

    const { pricingTierIds, action } = body;

    if (action === 'assign') {
      // Assign system-wide pricing tiers to merchant
      const assignments = [];
      
      for (const tierId of pricingTierIds) {
        // Check if system-wide tier exists
        const systemTier = await prisma.pricingTier.findUnique({
          where: { 
            id: tierId,
            merchantId: null, // Must be system-wide
          },
        });

        if (systemTier) {
          // Create merchant-specific copy
          const merchantTier = await prisma.pricingTier.create({
            data: {
              id: `pricing_${Date.now()}_${Math.random().toString(36).substring(2)}`,
              merchantId,
              serviceType: systemTier.serviceType,
              baseRate: systemTier.baseRate,
              negotiatedRate: systemTier.negotiatedRate,
              rateUnit: systemTier.rateUnit,
              currency: systemTier.currency,
              updatedAt: new Date()
            },
          });
          assignments.push(merchantTier);
        }
      }

      return NextResponse.json({
        message: `Successfully assigned ${assignments.length} pricing tiers`,
        assignments: assignments.map(tier => ({
          id: tier.id,
          serviceType: tier.serviceType,
          baseRate: tier.baseRate,
          negotiatedRate: tier.negotiatedRate,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Update merchant pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}