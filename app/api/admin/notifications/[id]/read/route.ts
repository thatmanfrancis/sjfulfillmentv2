import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Update the notification to mark it as read
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { 
        isRead: true,
        readCount: {
          increment: 1
        }
      },
    });

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
