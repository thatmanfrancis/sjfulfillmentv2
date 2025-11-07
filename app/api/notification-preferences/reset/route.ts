import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating notification preference` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { enabled = true } = body; // Default to enabled when resetting

    // Reset all notification preferences for the user
    const updatedPreferences = await prisma.notificationPreference.updateMany({
      where: {
        userId: auth.userId as string,
      },
      data: {
        enabled,
      },
    });

    return NextResponse.json(
      {
        message: "All notification preferences reset successfully",
        updatedCount: updatedPreferences.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset preferences error:", error);
    return NextResponse.json(
      { message: "Failed to reset preferences" },
      { status: 500 }
    );
  }
}
