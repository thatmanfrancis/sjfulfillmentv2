import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [
      totalNotifications,
      sentNotifications,
      pendingNotifications,
      failedNotifications,
      scheduledNotifications,
      totalRecipientsSum,
      totalReadSum
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.notification.count({ where: { status: 'PENDING' } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
      prisma.notification.count({ where: { status: 'SCHEDULED' } }),
      prisma.notification.aggregate({
        _sum: { totalRecipients: true }
      }),
      prisma.notification.aggregate({
        _sum: { readCount: true }
      })
    ]);

    const totalRecipients = totalRecipientsSum._sum.totalRecipients || 0;
    const totalRead = totalReadSum._sum.readCount || 0;
    const readRate = totalRecipients > 0 ? ((totalRead / totalRecipients) * 100) : 0;

    return NextResponse.json({
      totalNotifications,
      sentNotifications,
      pendingNotifications,
      failedNotifications,
      scheduledNotifications,
      totalRecipients,
      readRate: Math.round(readRate * 100) / 100, // Round to 2 decimal places
      deliveryRate: totalNotifications > 0 ? 
        Math.round(((sentNotifications / totalNotifications) * 100) * 100) / 100 : 0
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { 
        totalNotifications: 0,
        sentNotifications: 0,
        pendingNotifications: 0,
        failedNotifications: 0,
        scheduledNotifications: 0,
        totalRecipients: 0,
        readRate: 0,
        deliveryRate: 0
      },
      { status: 200 }
    );
  }
}