import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateRegionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).optional(),
  coverage: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const result = updateRegionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Check if warehouse/region exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id }
    });

    if (!existingWarehouse) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    // Map the update data to warehouse fields
    const warehouseUpdateData: any = {};
    if (updateData.name) warehouseUpdateData.name = updateData.name;
    if (updateData.coverage) warehouseUpdateData.region = updateData.coverage;
    if (updateData.code) warehouseUpdateData.code = updateData.code;
    // For isActive, we don't have this field in warehouse, so we'll ignore it for now

    // Update the warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data: warehouseUpdateData,
    });

    // Return the region in the expected format
    const region = {
      id: updatedWarehouse.id,
      name: updatedWarehouse.name,
      code: updatedWarehouse.code || '',
      isActive: true, // Always true since we don't have isActive field
      coverage: updatedWarehouse.region,
      createdAt: new Date().toISOString(), // Fallback since no createdAt in Warehouse
      updatedAt: new Date().toISOString(), // Fallback since no updatedAt in Warehouse
    };

    return NextResponse.json(region);

  } catch (error) {
    console.error('Update logistics region error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if warehouse/region exists and has dependencies
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      // include: {
      //   stockAllocations: true,
      //   LogisticsRegion: true,
      // }
      include: {
        LogisticsRegion: true,
        StockAllocation: true
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    if (
      warehouse.StockAllocation.length > 0 ||
      warehouse.LogisticsRegion.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete region with active stock allocations or assigned personnel",
        },
        { status: 400 }
      );
    }

    // Delete the warehouse/region
    await prisma.warehouse.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete logistics region error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}