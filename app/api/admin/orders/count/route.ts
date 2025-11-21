import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let where: any = {};
    
    if (status) {
      const statusList = status.split(',');
      where.status = { in: statusList };
    }

    const count = await prisma.order.count({ where });

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Error counting orders:', error);
    return NextResponse.json(
      { error: 'Failed to count orders' },
      { status: 500 }
    );
  }
}