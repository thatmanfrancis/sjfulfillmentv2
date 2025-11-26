export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const adminId = session.userId;
    const newKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const existing = await prisma.adminApiKey.findFirst({ where: { adminId } });
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    const updated = await prisma.adminApiKey.update({
      where: { id: existing.id },
      data: { apiKey: newKey, updatedAt: new Date(), isRevoked: false },
    });
    return NextResponse.json({ apiKey: updated.apiKey }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId') || session.userId;
    const apiKey = await prisma.adminApiKey.findFirst({ where: { adminId } });
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    return NextResponse.json({ apiKey: apiKey.apiKey });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const adminId = session.userId;
    const newKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const created = await prisma.adminApiKey.create({
      data: { adminId, apiKey: newKey, name: 'Admin Key', isRevoked: false },
    });
    return NextResponse.json({ apiKey: created.apiKey }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const adminId = session.userId;
    await prisma.adminApiKey.deleteMany({ where: { adminId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}