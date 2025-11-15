import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Verify logistics session
    const session = await getCurrentSession();
    
    if (!session || session.role !== 'LOGISTICS') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Get user's assigned warehouse regions
    const userRegions = await prisma.logisticsRegion.findMany({
      where: { userId: session.id },
      select: { warehouseId: true }
    });
    
    const assignedWarehouseIds = userRegions.map(region => region.warehouseId);

    // Fetch logistics dashboard statistics
    const [
      activeShipments,
      deliveredToday,
      pendingPickups,
      totalDrivers,
      regionsServed,
      recentShipments
    ] = await Promise.all([
      // Count active shipments in assigned warehouses
      prisma.shipment.count({
        where: {
          ...(assignedWarehouseIds.length > 0 && {
            order: {
              fulfillmentWarehouseId: { in: assignedWarehouseIds }
            }
          })
        }
      }),

      // Count deliveries completed today
      prisma.shipment.count({
        where: {
          lastStatusUpdate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          },
          ...(assignedWarehouseIds.length > 0 && {
            order: {
              fulfillmentWarehouseId: { in: assignedWarehouseIds }
            }
          })
        }
      }),

      // Count pending pickups
      prisma.order.count({
        where: {
          status: 'AWAITING_ALLOC',
          ...(assignedWarehouseIds.length > 0 && {
            fulfillmentWarehouseId: { in: assignedWarehouseIds }
          })
        }
      }),

      // Count total drivers (placeholder - would need driver table)
      Promise.resolve(25),

      // Count regions served
      assignedWarehouseIds.length > 0 
        ? assignedWarehouseIds.length
        : prisma.warehouse.count(),

      // Get recent shipments
      prisma.shipment.findMany({
        take: 10,
        orderBy: { lastStatusUpdate: 'desc' },
        include: {
          order: {
            include: {
              Business: {
                select: { name: true }
              }
            }
          }
        }
      })
    ]);

    // Calculate average delivery time
    const deliveryTimes = await prisma.shipment.findMany({
      where: {
        lastStatusUpdate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        lastStatusUpdate: true
      }
    });

    const avgDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((acc: number, shipment: any) => {
          const hours = (new Date().getTime() - new Date(shipment.lastStatusUpdate).getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }, 0) / deliveryTimes.length
      : 0;

    // Calculate on-time delivery rate
    const onTimeDeliveries = deliveryTimes.filter((shipment: any) => {
      const hours = (new Date().getTime() - new Date(shipment.lastStatusUpdate).getTime()) / (1000 * 60 * 60);
      return hours <= 24; // Consider on-time if delivered within 24 hours
    }).length;

    const onTimeDeliveryRate = deliveryTimes.length > 0 
      ? Math.round((onTimeDeliveries / deliveryTimes.length) * 100)
      : 0;

    // Regional performance calculation disabled
    // TODO: Re-implement when logistics regions are configured
    const regionalPerformance: any[] = [];

    const dashboardData = {
      activeShipments,
      deliveredToday,
      pendingPickups,
      averageDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
      totalDrivers,
      regionsServed,
      onTimeDeliveryRate,
      recentShipments: recentShipments.map((shipment: any) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        orderId: shipment.orderId,
        businessName: shipment.order?.Business?.name || 'Unknown',
        deliveryAttempts: shipment.deliveryAttempts,
        lastStatusUpdate: shipment.lastStatusUpdate
      })),
      regionalPerformance
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Logistics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}