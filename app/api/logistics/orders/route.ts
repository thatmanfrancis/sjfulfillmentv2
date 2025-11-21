import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

// Returns all orders assigned to the current logistics user
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'LOGISTICS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch orders assigned to this logistics user
    const orders = await prisma.order.findMany({
      where: { assignedLogisticsId: session.userId },
      include: {
        Business: { select: { name: true } },
        Warehouse: { select: { name: true, region: true } },
        OrderItem: {
          include: { Product: { select: { name: true, sku: true } } }
        }
      },
      orderBy: { orderDate: 'desc' }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch assigned orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
