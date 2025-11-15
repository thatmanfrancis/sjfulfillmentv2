import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { status } = await req.json();
    const orderId = id;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Build where clause for business filter
    const where: any = { id: orderId };

    // Add business filter for merchants
    if (session.user.role !== 'ADMIN') {
      where.businessId = session.user.businessId;
    }

    const order = await prisma.order.update({
      where,
      data: {
        status: status.toUpperCase()
      }
    });

    return NextResponse.json({ 
      success: true, 
      order,
      message: `Order status updated to ${status}` 
    });
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}