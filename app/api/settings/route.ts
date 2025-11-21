import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all settings
    const settings = await prisma.setting.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
      },
    });

    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      settings: settingsObj,
      raw: settings, // Also include raw format for admin use
    });
  } catch (error) {
    console.error('Settings get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (only admins should update settings)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    // Update each setting
    const updatePromises = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          id: crypto.randomUUID(),
          key,
          value: String(value),
          updatedAt: new Date(),
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}