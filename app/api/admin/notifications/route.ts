import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { z } from 'zod';

export async function GET(request: NextRequest) {
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
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || '';
    const status = url.searchParams.get('status') || '';
    const recipient = url.searchParams.get('recipient') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (recipient && recipient !== 'all') {
      where.recipient = recipient;
    }

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          User_Notification_createdByIdToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    const transformedNotifications = notifications.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message || notification.content,
      type: notification.type,
      priority: notification.priority || 'MEDIUM',
      recipient: notification.audienceType || 'ALL',
      status: notification.status || 'PENDING',
      createdAt: notification.createdAt.toISOString(),
      sentAt: notification.sentAt?.toISOString(),
      scheduledAt: notification.scheduledFor?.toISOString(),
      createdBy: notification.createdByUser ? 
        `${notification.createdByUser.firstName} ${notification.createdByUser.lastName}` : 
        'System',
      readCount: notification.readCount || 0,
      totalRecipients: notification.totalRecipients || 0,
      channels: notification.channels || ['IN_APP'],
      metadata: notification.metadata || {}
    }));

    return NextResponse.json({
      notifications: transformedNotifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    const {
      title,
      content,
      type,
      priority,
      audienceType,
      channels,
      scheduledFor,
      expiresAt,
      actionUrl,
      actionLabel,
      customAudience,
      isImmediate
    } = body;

    // Validate required fields
    if (!title || !content || !type || !priority || !audienceType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, type, priority, audienceType' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        title,
        content,
        message: content, // For backward compatibility
        type,
        priority,
        audienceType,
        channels: channels || ['IN_APP'],
        status: isImmediate ? 'SENT' : 'SCHEDULED',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        actionUrl: actionUrl || null,
        actionLabel: actionLabel || null,
        sentAt: isImmediate ? new Date() : null,
        metadata: {
          customAudience: customAudience || [],
          createdFrom: 'admin-panel'
        },
        updatedAt: new Date()
        // Note: You'll need to add createdById based on the authenticated user
        // createdById: userId
      }
    });

    return NextResponse.json({
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        title: notification.title,
        status: notification.status,
        createdAt: notification.createdAt.toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}