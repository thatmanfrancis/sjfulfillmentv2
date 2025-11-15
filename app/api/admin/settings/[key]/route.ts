import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { key } = await params;

    const setting = await prisma.setting.findUnique({
      where: { key: decodeURIComponent(key) },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      setting,
    });
  } catch (error) {
    console.error("Error fetching setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { key } = await params;
    const body = await request.json();
    const validatedData = updateSettingSchema.parse(body);

    const decodedKey = decodeURIComponent(key);

    const existingSetting = await prisma.setting.findUnique({
      where: { key: decodedKey },
    });

    if (!existingSetting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    const updatedSetting = await prisma.setting.update({
      where: { key: decodedKey },
      data: validatedData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Setting",
        entityId: updatedSetting.id,
        action: "SETTING_UPDATED",
        details: {
          key: updatedSetting.key,
          oldValue: existingSetting.value,
          newValue: updatedSetting.value,
          oldDescription: existingSetting.description,
          newDescription: updatedSetting.description,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      setting: updatedSetting,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const existingSetting = await prisma.setting.findUnique({
      where: { key: decodedKey },
    });

    if (!existingSetting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    await prisma.setting.delete({
      where: { key: decodedKey },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Setting",
        entityId: existingSetting.id,
        action: "SETTING_DELETED",
        details: {
          key: existingSetting.key,
          value: existingSetting.value,
          description: existingSetting.description,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({ message: "Setting deleted successfully" });
  } catch (error) {
    console.error("Error deleting setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}