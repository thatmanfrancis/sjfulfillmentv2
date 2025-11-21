import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const createSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
});

const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    let where: any = {};
    if (key) where.key = { contains: key };

    const settings = await prisma.setting.findMany({
      where,
      orderBy: { key: "asc" },
    });

    return NextResponse.json({
      settings,
      summary: {
        totalSettings: settings.length,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSettingSchema.parse(body);

    // Check if setting already exists
    const existingSetting = await prisma.setting.findUnique({
      where: { key: validatedData.key },
    });

    if (existingSetting) {
      return NextResponse.json(
        { error: "Setting with this key already exists" },
        { status: 409 }
      );
    }

    const setting = await prisma.setting.create({
      data: {
        ...validatedData,
        id: crypto.randomUUID(),
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Setting",
        entityId: setting.id,
        action: "SETTING_CREATED",
        details: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
        },
        changedById: session.userId,
        timestamp: new Date(),
        User: { connect: { id: session.userId } },
      },
    });

    return NextResponse.json({
      setting,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}