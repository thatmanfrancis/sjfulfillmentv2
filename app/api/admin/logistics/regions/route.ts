import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createRegionSchema = z.object({
  name: z.string().min(1, 'Region name is required').max(100),
  code: z.string().min(1, 'Region code is required').max(10),
  coverage: z.string().min(1, 'Coverage area is required').max(500),
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
    const result = createRegionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, code, coverage } = result.data;

    // Check if region with same name or code already exists
    const existingRegion = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { region: { equals: code, mode: 'insensitive' } }
        ]
      }
    });

    if (existingRegion) {
      return NextResponse.json(
        { error: 'A region with this name or code already exists' },
        { status: 400 }
      );
    }

    // Since LogisticsRegion is just a junction table for User-Warehouse relationships,
    // we'll create a warehouse to represent this region for now
    const warehouse = await prisma.warehouse.create({
      data: {
        id: `warehouse_${Date.now()}_${code}`,
        name: name,
        region: coverage,
        code: code,
        address: 'Regional Distribution Center',
        city: 'Regional City',
        state: 'Default State',
        country: 'Default Country',
        status: 'ACTIVE',
        capacity: 5000,
        currentStock: 0,
        contactEmail: 'regional@company.com',
        contactPhone: '+1-000-000-0000',
        manager: 'Regional Manager',
        type: 'STORAGE',
        description: 'Regional warehouse for logistics coverage',
        updatedAt: new Date()
      }
    });

    // Return the region in the expected format
    const region = {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code || code,
      isActive: true,
      coverage: warehouse.region,
      createdAt: new Date().toISOString(), // Fallback since no createdAt in Warehouse
      updatedAt: new Date().toISOString(), // Fallback since no updatedAt in Warehouse
    };

    return NextResponse.json(region, { status: 201 });

  } catch (error) {
    console.error('Create logistics region error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}