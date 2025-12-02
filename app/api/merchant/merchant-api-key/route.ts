import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await request.json();
    // Generate new API key
    const newKey =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const updated = await prisma.merchantApiKey.update({
      where: { id },
      data: { apiKey: newKey, isRevoked: false },
    });
    return NextResponse.json({ apiKey: updated.apiKey }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to regenerate API key" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get merchant's businessId
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });
    if (!user?.businessId) {
      return NextResponse.json({ apiKeys: [] });
    }
    const apiKeys = await prisma.merchantApiKey.findMany({
      where: { merchantId: user.businessId },
      select: {
        id: true,
        apiKey: true,
        name: true,
        isRevoked: true,
      },
    });
    return NextResponse.json({ apiKeys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name } = await request.json();
    // Get merchant's businessId
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });
    if (!user?.businessId) {
      return NextResponse.json({ error: "No business found" }, { status: 400 });
    }
    // Generate API key
    const apiKey =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const newKey = await prisma.merchantApiKey.create({
      data: {
        id: `mak_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        merchantId: user.businessId,
        apiKey,
        name,
      },
    });
    return NextResponse.json({ apiKey: newKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await request.json();
    await prisma.merchantApiKey.update({
      where: { id },
      data: { isRevoked: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
