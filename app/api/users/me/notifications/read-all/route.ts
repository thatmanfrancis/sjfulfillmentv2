import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while marking all notifications as read` },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: auth.userId as string,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      message: "All notifications marked as read",
      count: result.count,
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
