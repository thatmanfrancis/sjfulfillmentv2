import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

// GET: Fetch merchant API key
export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { businessId: true } });
  if (!user?.businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }
  const apiKey = await prisma.merchantApiKey.findFirst({ where: { merchantId: user.businessId } });
  return NextResponse.json({ apiKey: apiKey?.apiKey || null });
}

// POST: Create merchant API key
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { businessId: true } });
  if (!user?.businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }
  // Generate a new API key (simple random string for demo)
  const apiKey = `mkey_${Math.random().toString(36).slice(2, 18)}`;
  const created = await prisma.merchantApiKey.create({
    data: {
      id: `mak_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      merchantId: user.businessId,
      apiKey,
      name: "Merchant Key",
    },
  });
  return NextResponse.json({ apiKey: created.apiKey });
}

// PUT: Regenerate merchant API key
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { businessId: true } });
  if (!user?.businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }
  // Generate a new API key
  const apiKey = `mkey_${Math.random().toString(36).slice(2, 18)}`;
  // Find existing key
  const existingKey = await prisma.merchantApiKey.findFirst({ where: { merchantId: user.businessId } });
  let updated;
  if (existingKey) {
    updated = await prisma.merchantApiKey.upsert({
      where: { id: existingKey.id },
      update: { apiKey },
      create: {
        id: existingKey.id,
        merchantId: user.businessId,
        apiKey,
        name: existingKey.name || "Merchant Key",
      },
    });
  } else {
    updated = await prisma.merchantApiKey.create({
      data: {
        id: `mak_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        merchantId: user.businessId,
        apiKey,
        name: "Merchant Key",
      },
    });
  }
  return NextResponse.json({ apiKey: updated.apiKey });
}

// DELETE: Remove merchant API key
export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { businessId: true } });
  if (!user?.businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }
  await prisma.merchantApiKey.deleteMany({ where: { merchantId: user.businessId } });
  return NextResponse.json({ success: true });
}
