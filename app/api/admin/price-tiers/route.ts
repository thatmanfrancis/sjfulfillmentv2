import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createPricingTierSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required').max(100),
  baseRate: z.number().min(0, 'Base rate must be positive'),
  negotiatedRate: z.number().min(0, 'Negotiated rate must be positive'),
  rateUnit: z.string().min(1, 'Rate unit is required'),
  currency: z.string().default('USD'),
  merchantId: z.string().optional(), // Allow admin to specify merchant
});

const updatePricingTierSchema = createPricingTierSchema.partial();

export async function GET(request: NextRequest) {
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

    // Get all pricing tiers with business count
    const pricingTiers = await prisma.pricingTier.findMany({
      include: {
        Business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform the data to include business count
    const transformedTiers = pricingTiers.map(tier => ({
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
    const activeTiers = transformedTiers.filter(t => t.isActive).length;
    const averageBaseRate = totalTiers > 0 
      ? transformedTiers.reduce((sum, tier) => sum + tier.baseRate, 0) / totalTiers 
      : 0;
    const totalBusinessesUsingTiers = transformedTiers.reduce((sum, tier) => sum + tier.businessCount, 0);

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
    console.error('Get pricing tiers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Map frontend field names to backend schema
    const mappedBody = {
      serviceType: body.name || body.serviceType,
      baseRate: typeof body.baseRate === 'string' ? parseFloat(body.baseRate) : body.baseRate,
      negotiatedRate: typeof body.ratePerKg === 'string' ? parseFloat(body.ratePerKg) : body.ratePerKg,
      rateUnit: 'per_kg', // Default unit
      currency: body.currency || 'USD',
      merchantId: body.merchantId || null,
    };
    
    // Validate the mapped data
    const result = createPricingTierSchema.safeParse(mappedBody);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      serviceType,
      baseRate,
      negotiatedRate,
      rateUnit,
      currency,
      merchantId,
    } = result.data;

    // Check if pricing tier with same service type already exists
    const existingTier = await prisma.pricingTier.findFirst({
      where: { 
        serviceType: {
          equals: serviceType,
          mode: 'insensitive',
        },
      },
    });

    if (existingTier) {
      return NextResponse.json(
        { error: 'A pricing tier with this service type already exists' },
        { status: 400 }
      );
    }

    // Create the pricing tier
    const createData: any = {
      serviceType,
      baseRate,
      negotiatedRate,
      rateUnit,
      currency,
    };
    if (merchantId) {
      createData.merchantId = merchantId;
    }
    const pricingTier = await prisma.pricingTier.create({
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

    return NextResponse.json({
      id: pricingTier.id,
      name: pricingTier.serviceType,
      description: `${pricingTier.rateUnit} pricing`,
      baseRate: pricingTier.baseRate,
      ratePerKg: pricingTier.negotiatedRate,
      ratePerKm: pricingTier.baseRate * 0.5,
      minimumCharge: pricingTier.baseRate,
      isActive: true,
      businessCount: 0,
      createdAt: pricingTier.createdAt.toISOString(),
      updatedAt: pricingTier.updatedAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Create pricing tier error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}