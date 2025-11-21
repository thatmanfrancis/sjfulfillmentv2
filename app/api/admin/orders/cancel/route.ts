import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELED' },
    });
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
