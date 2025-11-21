import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only fetch notifications for merchants
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '40');
    // Find notifications for this merchant user or for all merchants
    const where: any = {
      OR: [
        { userId: session.userId },
        { audienceType: { in: ['MERCHANT', 'ALL'] } }
      ]
    };
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { message: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
