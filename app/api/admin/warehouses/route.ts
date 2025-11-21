import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { z } from 'zod';

// Validation schema for warehouse creation (all fields)
const CreateWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  region: z.string().min(1, 'Region is required'),
  capacity: z.coerce.number().min(1, 'Capacity must be greater than 0'),
  manager: z.string().min(1, 'Manager name is required'),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  type: z.enum(['FULFILLMENT', 'STORAGE', 'DISTRIBUTION', 'CROSS_DOCK']),
  description: z.string().optional(),
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
    const validationResult = CreateWarehouseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }


    // Create the warehouse with all fields
    const warehouse = await prisma.warehouse.create({
      data: {
        id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        country: body.country,
        region: body.region,
        capacity: body.capacity,
        manager: body.manager,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        type: body.type,
        description: body.description,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Warehouse created successfully',
      warehouse,
    }, { status: 201 });

  } catch (error) {
    console.error('Warehouse creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list warehouses
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const region = searchParams.get('region') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Build where clause for warehouses
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { manager: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (region && region !== 'all') {
      where.region = { contains: region, mode: 'insensitive' };
    }

    // Get total count for pagination
    const totalWarehouses = await prisma.warehouse.count({ where });
    const totalPages = Math.ceil(totalWarehouses / limit);

    // Get warehouses with their related data
    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        StockAllocation: true,
        Order: {
          select: { id: true }
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalStock = warehouses.reduce((sum: number, w: any) => 
      sum + w.StockAllocation.reduce((stockSum: number, sa: any) => stockSum + sa.allocatedQuantity, 0), 0
    );

    const totalCapacity = warehouses.reduce((sum: number, w: any) => sum + (w.capacity || 0), 0);

    const stats = {
      totalWarehouses: totalWarehouses,
      activeWarehouses: warehouses.filter(w => w.status === 'ACTIVE').length,
      inactiveWarehouses: warehouses.filter(w => w.status === 'INACTIVE').length,
      maintenanceWarehouses: warehouses.filter(w => w.status === 'MAINTENANCE').length,
      totalCapacity,
      totalStock,
      utilizationRate: totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0,
    };

    // Transform warehouses data to match expected interface
    const warehousesData = warehouses.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      location: `${warehouse.city || ''}, ${warehouse.state || ''}`.replace(/^,\s*|,\s*$/g, '') || warehouse.region,
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      zipCode: warehouse.zipCode || '',
      country: warehouse.country || '',
      region: warehouse.region,
      capacity: warehouse.capacity || 0,
      currentStock: warehouse.StockAllocation.reduce((sum: number, sa: any) => sum + sa.allocatedQuantity, 0),
      manager: warehouse.manager,
      contactEmail: warehouse.contactEmail,
      contactPhone: warehouse.contactPhone,
      status: warehouse.status || 'ACTIVE',
      type: warehouse.type || 'STORAGE',
      description: warehouse.description,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
      _count: {
        inventoryItems: warehouse.StockAllocation.length,
        fulfillmentOrders: warehouse.Order.length
      }
    }));

    return NextResponse.json({
      warehouses: warehousesData,
      stats,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: totalWarehouses,
      }
    });

  } catch (error) {
    console.error('Failed to fetch warehouses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}