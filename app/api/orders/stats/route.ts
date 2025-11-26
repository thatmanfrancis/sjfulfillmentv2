import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build where clause
    const where: any = {};
    
    // Add business filter for merchants
    if (session.role !== 'ADMIN') {
      where.businessId = session.businessId;
    }

    const stats = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    });

    const totalOrders = await prisma.order.count({ where });

    const result = {
      total: totalOrders,
      pending: stats.find(s => s.status === 'NEW')?._count.id || 0,
      processing: stats.find(s => s.status === 'AWAITING_ALLOC')?._count.id || 0,
      shipped: stats.find(s => s.status === 'DELIVERING')?._count.id || 0,
      delivered: stats.find(s => s.status === 'DELIVERED')?._count.id || 0,
      cancelled: stats.find(s => s.status === 'CANCELED')?._count.id || 0
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch order stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}