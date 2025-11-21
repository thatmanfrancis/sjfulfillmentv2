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

    // Get warehouse with detailed statistics
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        StockAllocation: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        },
        Order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            orderDate: true
          }
        }
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Calculate statistics
    const totalProducts = warehouse.StockAllocation.length;
    const totalStock = warehouse.StockAllocation.reduce((sum, sa) => sum + sa.allocatedQuantity, 0);
    const lowStockItems = warehouse.StockAllocation.filter(sa => sa.allocatedQuantity <= sa.safetyStock).length;
    const outOfStockItems = warehouse.StockAllocation.filter(sa => sa.allocatedQuantity === 0).length;
    
    const totalOrders = warehouse.Order.length;
    const pendingShipments = warehouse.Order.filter(o => ['NEW', 'AWAITING_ALLOC', 'DISPATCHED'].includes(o.status)).length;
    
    const utilizationRate = warehouse.capacity ? Math.round((totalStock / warehouse.capacity) * 100) : 0;

    // Top products by quantity
    const topProducts = warehouse.StockAllocation
      .sort((a, b) => b.allocatedQuantity - a.allocatedQuantity)
      .slice(0, 10)
      .map(sa => ({
        id: sa.Product.id,
        name: sa.Product.name,
        sku: sa.Product.sku,
        quantity: sa.allocatedQuantity
      }));

    // Mock recent activity (in a real app, you'd have an activity log table)
    const recentActivity = [
      {
        id: '1',
        type: 'STOCK_IN',
        description: 'Received 50 units of Product ABC',
        timestamp: new Date().toISOString()
      },
      {
        id: '2', 
        type: 'ORDER',
        description: 'Order #12345 fulfilled',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'TRANSFER',
        description: 'Transferred 25 units to Main Warehouse',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    const stats = {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalOrders,
      pendingShipments,
      utilizationRate,
      topProducts,
      recentActivity
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Failed to fetch warehouse stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}