import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role and businessId
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true }
    });
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalSettings,
      editableSettings,
      securitySettings,
      apiSettings,
      recentUpdate
    ] = await Promise.all([
      prisma.setting.count({}),
      prisma.setting.count({ where: { isEditable: true } }),
      prisma.setting.count({ where: { category: 'SECURITY' } }),
      prisma.setting.count({ where: { category: 'API' } }),
      prisma.setting.findFirst({
        where: {},
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ]);

    const configurationHealth = 95; // Placeholder for merchant config health

    return NextResponse.json({
      totalSettings,
      editableSettings,
      securitySettings,
      apiSettings,
      lastUpdated: recentUpdate?.updatedAt.toISOString() || new Date().toISOString(),
      configurationHealth
    });

  } catch (error) {
    console.error('Error fetching merchant settings stats:', error);
    return NextResponse.json(
      { 
        totalSettings: 0,
        editableSettings: 0,
        securitySettings: 0,
        apiSettings: 0,
        lastUpdated: new Date().toISOString(),
        configurationHealth: 0
      },
      { status: 500 }
    );
  }
}
