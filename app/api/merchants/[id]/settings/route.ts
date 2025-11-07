import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching settings` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const settings = await prisma.merchantSetting.findMany({
      where: { merchantId: id },
    });

    // Convert to key-value object
    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Settings must be an object" },
        { status: 400 }
      );
    }

    // Update each setting
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.merchantSetting.upsert({
        where: {
          merchantId_key: {
            merchantId: id,
            key,
          },
        },
        create: {
          merchantId: id,
          key,
          value: value as string,
        },
        update: {
          value: value as string    ,
        },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
