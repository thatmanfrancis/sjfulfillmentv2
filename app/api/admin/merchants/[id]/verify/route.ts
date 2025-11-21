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

    // Find the business and its primary merchant user
    const business = await prisma.business.findUnique({
      where: { id: merchantId },
      include: {
        User_User_businessIdToBusiness: {
          where: { role: 'MERCHANT' },
          take: 1
        }
      }
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    const merchantUser = business.User_User_businessIdToBusiness[0];
    if (!merchantUser) {
      return NextResponse.json(
        { error: 'Merchant user not found' },
        { status: 404 }
      );
    }

    // Update user verification status
    await prisma.user.update({
      where: { id: merchantUser.id },
      data: { isVerified: true }
    });

    return NextResponse.json({
      message: 'Merchant account verified successfully',
      merchantId,
      userId: merchantUser.id
    });

  } catch (error) {
    console.error('Verify merchant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}