import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productIds, status } = await req.json();

    if (!productIds || !Array.isArray(productIds) || !status) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Build where clause for business filter
    const where: any = {
      id: { in: productIds }
    };

    // Add business filter for merchants
    if (session.user.role !== 'ADMIN') {
      where.businessId = session.user.businessId;
    }

    // Product model doesn't have a status field - disable this functionality
    return NextResponse.json({ 
      error: 'Product bulk status update not available - schema limitations',
      details: 'Product model requires schema update to support status field',
      updatedCount: 0
    }, { status: 501 });
  } catch (error) {
    console.error('Failed to bulk update products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}