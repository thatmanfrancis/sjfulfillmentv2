import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const bulkUpdateSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'delete']),
  notificationIds: z.array(z.string().uuid()).optional(),
  filters: z.object({
    type: z.string().optional(),
    isRead: z.boolean().optional(),
    olderThan: z.string().transform((str) => new Date(str)).optional(),
  }).optional(),
});

// POST /api/notifications/bulk - Bulk update notifications
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = bulkUpdateSchema.parse(body);

    // Build where clause for the operation
    let where: any = {
      userId: authResult.user.id,
    };

    if (validatedData.notificationIds) {
      where.id = { in: validatedData.notificationIds };
    }

    if (validatedData.filters) {
      const { type, isRead, olderThan } = validatedData.filters;
      
      if (type) where.type = type;
      if (isRead !== undefined) where.isRead = isRead;
      if (olderThan) where.createdAt = { lt: olderThan };
    }

    let result;
    
    switch (validatedData.action) {
      case 'mark_read':
        result = await prisma.notification.updateMany({
          where,
          data: { isRead: true },
        });
        break;
        
      case 'mark_unread':
        result = await prisma.notification.updateMany({
          where,
          data: { isRead: false },
        });
        break;
        
      case 'delete':
        result = await prisma.notification.deleteMany({ where });
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Get updated counts
    const [unreadCount, totalCount] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: authResult.user.id,
          isRead: false,
        },
      }),
      prisma.notification.count({
        where: {
          userId: authResult.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      message: `Successfully ${validatedData.action.replace('_', ' ')}ed ${result.count} notification${result.count !== 1 ? 's' : ''}`,
      affected: result.count,
      summary: {
        unreadCount,
        totalCount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error bulk updating notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}