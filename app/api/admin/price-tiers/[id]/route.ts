import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updatePricingTierSchema = z.object({
  name: z.string().min(1).optional(), // Maps to serviceType
  baseRate: z.number().min(0).optional(),
  ratePerKg: z.number().min(0).optional(), // Maps to negotiatedRate
  ratePerKm: z.number().min(0).optional(),
  minimumCharge: z.number().min(0).optional(),
  description: z.string().optional(),
  serviceType: z.string().min(1).optional(), // Direct mapping
  negotiatedRate: z.number().min(0).optional(), // Direct mapping
  rateUnit: z.string().optional(),
  currency: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{id: string}>}
) {
  try {
    const{ id} = await params;
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
    // Expect payload: { name, description, currency, packages: [...] }
    const { name, description, currency, packages } = body;

    // Update parent group
    const group = await prisma.priceTierGroup.update({
      where: { id },
      data: {
        name,
        description,
        currency,
        updatedAt: new Date(),
      },
    });

    // Update children (packages)
    // For each package: if id exists, update; else, create
    if (Array.isArray(packages)) {
      for (const pkg of packages) {
        if (pkg.id) {
          await prisma.pricingTier.update({
            where: { id: pkg.id },
            data: {
              serviceType: pkg.serviceType,
              baseRate: pkg.baseRate,
              negotiatedRate: pkg.negotiatedRate,
              rateUnit: pkg.rateUnit,
              currency: pkg.currency,
              discountPercent: pkg.discountPercent,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.pricingTier.create({
            data: {
              serviceType: pkg.serviceType,
              baseRate: pkg.baseRate,
              negotiatedRate: pkg.negotiatedRate,
              rateUnit: pkg.rateUnit,
              currency: pkg.currency,
              discountPercent: pkg.discountPercent,
              updatedAt: new Date(),
              groupId: id,
            },
          });
        }
      }
    }

    // Optionally: delete children not present in packages
    // (not implemented here, but can be added)

    // Return updated group and children
    const updatedGroup = await prisma.priceTierGroup.findUnique({
      where: { id },
      include: {
        pricingTiers: true,
      },
    });

    return NextResponse.json({
      group: updatedGroup,
    });

  } catch (error) {
    console.error('Update pricing tier error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const id = params.id;
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

    // Check if pricing tier exists and has associated businesses
    const existingTier = await prisma.pricingTier.findUnique({
      where: { id },
      include: {
        Business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingTier) {
      return NextResponse.json(
        { error: 'Pricing tier not found' },
        { status: 404 }
      );
    }

    if (existingTier.Business) {
      return NextResponse.json(
        { error: 'Cannot delete pricing tier that is in use by a business' },
        { status: 400 }
      );
    }

    // Delete the pricing tier
    await prisma.pricingTier.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Pricing tier deleted successfully',
    });

  } catch (error) {
    console.error('Delete pricing tier error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}