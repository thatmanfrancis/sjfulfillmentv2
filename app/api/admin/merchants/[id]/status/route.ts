import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const merchantId = id;
    const { isActive } = await request.json();

    // Update business status
    await prisma.business.update({
      where: { id: merchantId },
      data: { isActive }
    });

    return NextResponse.json({
      message: `Merchant account ${isActive ? 'activated' : 'deactivated'} successfully`,
      merchantId,
      isActive
    });

  } catch (error) {
    console.error('Toggle merchant status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}