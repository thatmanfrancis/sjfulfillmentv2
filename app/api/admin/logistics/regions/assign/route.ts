import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const assignWarehouseSchema = z.object({
  userId: z.string().uuid(),
  warehouseId: z.string().uuid(),
});

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
    const { userId, warehouseId } = assignWarehouseSchema.parse(body);

    // Verify the user exists and has LOGISTICS role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'LOGISTICS') {
      return NextResponse.json(
        { error: 'User not found or not a logistics user' },
        { status: 404 }
      );
    }

    // Verify the warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.logisticsRegion.findUnique({
      where: {
        userId_warehouseId: {
          userId,
          warehouseId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this warehouse' },
        { status: 409 }
      );
    }

    // Create the assignment
    const logisticsRegion = await prisma.logisticsRegion.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        warehouseId,
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Warehouse: {
          select: {
            name: true,
            region: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'User assigned to warehouse successfully',
      assignment: logisticsRegion,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Assign logistics user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}