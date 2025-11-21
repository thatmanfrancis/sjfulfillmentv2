import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

// Helper function to get notification titles
function getNotificationTitle(type: string, message: string): string {
  switch (type) {
    case 'ORDER_CREATED':
      return 'New Order Created';
    case 'ORDER_STATUS_UPDATED':
      return 'Order Status Updated';
    case 'ORDER_ASSIGNED':
      return 'Order Assigned';
    case 'ORDER_DISPATCHED':
      return 'Order Dispatched';
    case 'ORDER_CANCELLED':
      return 'Order Cancelled';
    case 'PAYMENT_RECEIVED':
      return 'Payment Received';
    case 'PAYMENT_FAILED':
      return 'Payment Failed';
    case 'INVOICE_GENERATED':
      return 'Invoice Generated';
    case 'STOCK_LOW':
      return 'Low Stock Alert';
    case 'STOCK_ALERT':
      return 'Stock Alert';
    case 'WAREHOUSE_ASSIGNED':
      return 'Warehouse Assigned';
    case 'ACCOUNT_CREATED':
      return 'Account Created';
    case 'ACCOUNT_SUSPENDED':
      return 'Account Suspended';
    case 'PASSWORD_CHANGED':
      return 'Password Changed';
    case 'REGION_ASSIGNED':
      return 'Region Assigned';
    case 'REGION_UPDATED':
      return 'Region Updated';
    case 'REGION_REMOVED':
      return 'Region Removed';
    case 'SYSTEM_MAINTENANCE':
      return 'System Maintenance';
    case 'SYSTEM_ALERT':
      return 'System Alert';
    default:
      return message.length > 30 ? message.substring(0, 30) + '...' : message;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("isRead");

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {
      userId: session.userId,
    };

    if (isRead !== null) {
      where.isRead = isRead === "true";
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          message: true,
          linkUrl: true,
          isRead: true,
          sendEmail: true,
          userId: true
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: session.userId,
          isRead: false,
        },
      }),
    ]);

    const formattedNotifications = notifications.map((notif: any) => ({
      ...notif,
      title: getNotificationTitle('general', notif.message),
      type: 'general',
      createdAt: new Date().toISOString(), // Use current date since we don't have createdAt
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      meta: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, isRead, notificationIds, markAsRead } = body;

    // Support both single and bulk operations
    if (notificationIds && Array.isArray(notificationIds)) {
      // Bulk operation
      const updateData = {
        isRead: markAsRead ?? true
      };

      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.userId,
        },
        data: updateData,
      });

      return NextResponse.json({
        message: `${notificationIds.length} notifications updated successfully`,
        updated: notificationIds.length,
      });
    } else if (id) {
      // Single operation
      const notification = await prisma.notification.update({
        where: {
          id,
          userId: session.userId,
        },
        data: {
          isRead: isRead ?? true,
        },
      });

      return NextResponse.json({
        message: "Notification updated successfully",
        notification,
      });
    } else {
      return NextResponse.json(
        { error: "Either 'id' or 'notificationIds' is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const createSchema = z.object({
      userId: z.string(),
      title: z.string().min(1),
      message: z.string().min(1),
      linkUrl: z.string().optional(),
      sendEmail: z.boolean().default(true),
    });

    const validatedData = createSchema.parse(body);

    const notification = await prisma.notification.create({
      data: {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        ...validatedData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: "Notification created successfully",
      notification,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("POST /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}