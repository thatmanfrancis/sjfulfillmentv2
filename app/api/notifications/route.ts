import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const isRead = searchParams.get("isRead");

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {
      userId: authResult.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (isRead !== null) {
      where.isRead = isRead === "true";
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: authResult.user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        unreadCount,
        totalNotifications: total,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification (Admin/System only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can create notifications manually
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const createNotificationSchema = z.object({
      userId: z.string().uuid(),
      message: z.string().min(1).max(500),
      link: z.string().max(200).optional(),
      type: z.enum([
        'ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_ASSIGNED', 'ORDER_DISPATCHED', 'ORDER_CANCELLED',
        'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_GENERATED',
        'STOCK_LOW', 'STOCK_ALERT', 'WAREHOUSE_ASSIGNED',
        'ACCOUNT_CREATED', 'ACCOUNT_SUSPENDED', 'PASSWORD_CHANGED',
        'REGION_ASSIGNED', 'REGION_UPDATED', 'REGION_REMOVED',
        'SYSTEM_MAINTENANCE', 'SYSTEM_ALERT', 'GENERAL'
      ]),
      metadata: z.record(z.string(), z.any()).optional(),
    });

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, firstName: true, lastName: true, isVerified: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    if (!targetUser.isVerified) {
      return NextResponse.json(
        { error: "Cannot send notification to unverified user" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: validatedData,
    });

    return NextResponse.json({
      ...notification,
      timeAgo: "Just now",
      isRecent: true,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}