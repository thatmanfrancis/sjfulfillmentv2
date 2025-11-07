import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching notification preferences` },
      { status: 401 }
    );
  }

  try {
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: auth.userId as string,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating notification preferences` },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { preferences } = body;

    if (!Array.isArray(preferences)) {
      return NextResponse.json(
        { error: "Preferences must be an array" },
        { status: 400 }
      );
    }

    // Update or create preferences
    const updates = preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_notificationType_channel: {
            userId: auth.userId as string,
            notificationType: pref.notificationType,
            channel: pref.channel,
          },
        },
        create: {
          userId: auth.userId as string,
          notificationType: pref.notificationType,
          channel: pref.channel,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      })
    );

    await Promise.all(updates);

    return NextResponse.json(
      {
        message: "Notification preferences updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { message: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
