import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

// Returns logistics analytics for the dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'LOGISTICS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(request.url);
    const deliveredOnly = url.searchParams.get('deliveredOnly') === 'true';

    // Total products handled (sum of all OrderItem quantities for assigned orders)
    const totalProductsHandled = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        Order: { assignedLogisticsId: session.userId }
      }
    });

    // Total completed orders (DELIVERED status)
    const completedOrders = await prisma.order.count({
      where: {
        assignedLogisticsId: session.userId,
        status: 'DELIVERED'
      }
    });

    // Total assigned orders
    const totalAssignedOrders = await prisma.order.count({
      where: { assignedLogisticsId: session.userId }
    });

    // Orders in progress (not delivered/canceled)
    const inProgressOrders = await prisma.order.count({
      where: {
        assignedLogisticsId: session.userId,
        status: { notIn: ['DELIVERED', 'CANCELED'] }
      }
    });

    // Latest assignments (last 5 assigned orders, filtered if deliveredOnly)
    const latestAssignments = await prisma.order.findMany({
      where: {
        assignedLogisticsId: session.userId,
        ...(deliveredOnly
          ? { status: 'DELIVERED' }
          : { status: { notIn: ['DELIVERED', 'CANCELED'] } })
      },
      orderBy: { orderDate: 'desc' },
      take: 5,
      include: {
        Business: { select: { name: true } },
        Warehouse: { select: { name: true, region: true } },
        OrderItem: { include: { Product: true } },
        Shipment: { select: { id: true } },
        OrderWarehousePick: {
          include: {
            Warehouse: { select: { name: true, region: true } }
          }
        }
      }
    });

    return NextResponse.json({
      totalProductsHandled: totalProductsHandled._sum.quantity || 0,
      completedOrders,
      totalAssignedOrders,
      inProgressOrders,
      latestAssignments
    });
  } catch (error) {
    console.error('Failed to fetch logistics analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
