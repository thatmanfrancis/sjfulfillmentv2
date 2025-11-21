import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { orderId, updates } = await request.json();
    if (!orderId || !updates) {
      return NextResponse.json({ error: 'Order ID and updates required' }, { status: 400 });
    }
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updates,
    });
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Edit order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
