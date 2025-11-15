import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds, status } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || !status) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Build where clause for business filter
    const where: any = {
      id: { in: orderIds }
    };

    // Add business filter for merchants
    if (session.user.role !== 'ADMIN') {
      where.businessId = session.user.businessId;
    }

    const result = await prisma.order.updateMany({
      where,
      data: {
        status: status.toUpperCase(),
        // updatedAt is auto-managed by Prisma
      }
    });

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.count,
      message: `Successfully updated ${result.count} orders to ${status}` 
    });
  } catch (error) {
    console.error('Failed to bulk update orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}