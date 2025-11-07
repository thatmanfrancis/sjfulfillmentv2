import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching notifications` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type") as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: auth.userId as string,
    };

    if (unreadOnly) {
      where.readAt = null;
    }

    if (type) {
      where.type = type;
    }

    // Get notifications
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: auth.userId as string,
        readAt: null,
      },
    });

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
