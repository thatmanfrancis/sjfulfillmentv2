import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params;
    
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

    // Get warehouse details with stock allocations
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        StockAllocation: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                sku: true,
                Business: {
                  select: { name: true }
                }
              }
            }
          }
        },
        Order: {
          select: { id: true }
        }
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const warehouseData = {
      id: warehouse.id,
      name: warehouse.name,
      region: warehouse.region,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      zipCode: warehouse.zipCode,
      country: warehouse.country,
      capacity: warehouse.capacity || 0,
      currentStock: warehouse.currentStock || 0,
      manager: warehouse.manager,
      contactEmail: warehouse.contactEmail,
      contactPhone: warehouse.contactPhone,
      status: warehouse.status,
      type: warehouse.type,
      description: warehouse.description,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
      _count: {
        inventoryItems: warehouse.StockAllocation.length,
        fulfillmentOrders: warehouse.Order.length
      }
    };

    return NextResponse.json(warehouseData);

  } catch (error) {
    console.error('Failed to fetch warehouse:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params;
    
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

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Warehouse name is required' },
        { status: 400 }
      );
    }

    if (!body.region?.trim()) {
      return NextResponse.json(
        { error: 'Region is required' },
        { status: 400 }
      );
    }

    if (!body.capacity || body.capacity <= 0) {
      return NextResponse.json(
        { error: 'Valid capacity is required' },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!existingWarehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Update the warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        name: body.name.trim(),
        region: body.region.trim(),
        address: body.address?.trim(),
        city: body.city?.trim(),
        state: body.state?.trim(),
        zipCode: body.zipCode?.trim(),
        country: body.country?.trim(),
        capacity: body.capacity,
        manager: body.manager?.trim(),
        contactEmail: body.contactEmail?.trim(),
        contactPhone: body.contactPhone?.trim(),
        status: body.status,
        type: body.type,
        description: body.description?.trim(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Warehouse updated successfully',
      warehouse: {
        id: updatedWarehouse.id,
        name: updatedWarehouse.name,
        region: updatedWarehouse.region,
        status: updatedWarehouse.status
      }
    });

  } catch (error) {
    console.error('Failed to update warehouse:', error);
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
    const { id: warehouseId } = await params;
    
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

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        StockAllocation: {
          include: {
            Product: true
          }
        },
        Order: true
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Check for active stock allocations
    const hasActiveStock = warehouse.StockAllocation.length > 0;
    
    if (hasActiveStock && !body.migrationPlan && !body.force) {
      return NextResponse.json(
        { 
          error: 'Warehouse has active stock allocations. Please provide a migration plan or use force delete.',
          hasActiveStock: true,
          stockCount: warehouse.StockAllocation.length
        },
        { status: 400 }
      );
    }

    // Perform deletion with migration if needed
    await prisma.$transaction(async (tx) => {
      // If migration plan provided, migrate products
      if (body.migrationPlan && hasActiveStock) {
        for (const [productId, allocations] of Object.entries(body.migrationPlan)) {
          // Delete current allocation
          await tx.stockAllocation.delete({
            where: {
              productId_warehouseId: {
                productId: productId as string,
                warehouseId: warehouseId
              }
            }
          });

          // Create new allocations
          for (const allocation of allocations as any[]) {
            const existingAllocation = await tx.stockAllocation.findUnique({
              where: {
                productId_warehouseId: {
                  productId: productId as string,
                  warehouseId: allocation.warehouseId
                }
              }
            });

            if (existingAllocation) {
              // Update existing allocation
              await tx.stockAllocation.update({
                where: {
                  productId_warehouseId: {
                    productId: productId as string,
                    warehouseId: allocation.warehouseId
                  }
                },
                data: {
                  allocatedQuantity: {
                    increment: allocation.quantity
                  }
                }
              });
            } else {
              // Create new allocation
              await tx.stockAllocation.create({
                data: {
                  id: crypto.randomUUID(),
                  productId: productId as string,
                  warehouseId: allocation.warehouseId,
                  allocatedQuantity: allocation.quantity,
                  safetyStock: 0
                }
              });
            }
          }
        }
      } else if (hasActiveStock) {
        // Force delete - remove all stock allocations
        await tx.stockAllocation.deleteMany({
          where: { warehouseId: warehouseId }
        });
      }

      // Delete related records
      await tx.logisticsRegion.deleteMany({
        where: { warehouseId: warehouseId }
      });

      // Update orders to remove warehouse reference
      await tx.order.updateMany({
        where: { fulfillmentWarehouseId: warehouseId },
        data: { fulfillmentWarehouseId: null }
      });

      // Finally delete the warehouse
      await tx.warehouse.delete({
        where: { id: warehouseId }
      });
    });

    return NextResponse.json({
      message: 'Warehouse deleted successfully',
      migrated: body.migrationPlan ? Object.keys(body.migrationPlan).length : 0
    });

  } catch (error) {
    console.error('Failed to delete warehouse:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}