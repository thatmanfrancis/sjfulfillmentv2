import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get security logs for the user (using AuditLog model)
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { changedById: session.userId },
          { entityId: session.userId, entityType: 'User' }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to last 50 logs
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        timestamp: true,
        details: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Format the logs for the frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      ipAddress: '127.0.0.1', // Placeholder as we don't store IP in current schema
      userAgent: 'Browser', // Placeholder as we don't store user agent in current schema
      location: 'Unknown', // Placeholder as we don't store location in current schema
      createdAt: log.timestamp.toISOString(),
      details: log.details,
      changedBy: `${log.User?.firstName ?? ''} ${log.User?.lastName ?? ''}`
    }));

    return NextResponse.json({
      logs: formattedLogs
    });
  } catch (error) {
    console.error('Security logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}