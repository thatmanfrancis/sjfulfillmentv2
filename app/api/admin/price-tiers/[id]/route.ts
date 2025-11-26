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
    
    // Validate the request data
    const result = updatePricingTierSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Map frontend fields to backend fields
    const mappedData: any = {};
    if (updateData.name) mappedData.serviceType = updateData.name;
    if (updateData.serviceType) mappedData.serviceType = updateData.serviceType;
    if (updateData.baseRate !== undefined) mappedData.baseRate = updateData.baseRate;
    if (updateData.ratePerKg !== undefined) mappedData.negotiatedRate = updateData.ratePerKg;
    if (updateData.negotiatedRate !== undefined) mappedData.negotiatedRate = updateData.negotiatedRate;
    if (updateData.rateUnit) mappedData.rateUnit = updateData.rateUnit;
    if (updateData.currency) mappedData.currency = updateData.currency;

    // Check if pricing tier exists
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

    // If changing service type, check for duplicates
    if (mappedData.serviceType && mappedData.serviceType !== existingTier.serviceType) {
      const nameExists = await prisma.pricingTier.findFirst({
        where: { 
          serviceType: {
            equals: mappedData.serviceType,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'A pricing tier with this service type already exists' },
          { status: 400 }
        );
      }
    }

    // Update the pricing tier
    const updatedTier = await prisma.pricingTier.update({
      where: { id },
      data: mappedData,
    });

    return NextResponse.json({
      id: updatedTier.id,
      name: updatedTier.serviceType,
      description: `${updatedTier.rateUnit} pricing`,
      baseRate: updatedTier.baseRate,
      ratePerKg: updatedTier.negotiatedRate,
      ratePerKm: updatedTier.baseRate * 0.5,
      minimumCharge: updatedTier.baseRate,
      isActive: true,
      businessCount: existingTier.Business ? 1 : 0,
      createdAt: updatedTier.createdAt.toISOString(),
      updatedAt: updatedTier.updatedAt.toISOString(),
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