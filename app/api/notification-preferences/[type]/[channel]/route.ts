import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; channel: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating notification preference` },
      { status: 400 }
    );
  }

  try {
    const { type, channel } = await params;
    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_notificationType_channel: {
          userId: auth.userId as string,
          notificationType: type,
          channel: channel as any,
        },
      },
      create: {
        userId: auth.userId as string,
        notificationType: type,
        channel: channel as any,
        enabled,
      },
      update: {
        enabled,
      },
    });

    return NextResponse.json(
      {
        message: "Preference updated successfully",
        preference,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update preference error:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
