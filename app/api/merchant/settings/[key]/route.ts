import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true }
    });
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = await params;
    const setting = await prisma.setting.findFirst({
      where: { key: decodeURIComponent(key) },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Error fetching merchant setting:", error);
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
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true }
    });
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = await params;
    const body = await request.json();
    const validatedData = updateSettingSchema.parse(body);
    const decodedKey = decodeURIComponent(key);

    const updated = await prisma.setting.updateMany({
      where: { key: decodedKey },
      data: {
        value: validatedData.value,
        description: validatedData.description,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Setting not found or not updated" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating merchant setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
