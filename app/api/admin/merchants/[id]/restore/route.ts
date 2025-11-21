import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { createNotification, createAuditLog } from '@/lib/notifications';

// POST route to restore a soft-deleted merchant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      select: { role: true, email: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }


    // Find the soft-deleted merchant
    const merchant = await prisma.business.findUnique({
      where: {
        id,
        deletedAt: { not: null } // Only soft-deleted merchants
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Soft-deleted merchant not found' },
        { status: 404 }
      );
    }

    // Find merchant users
    const merchantUsers = await prisma.user.findMany({
      where: {
        businessId: id,
        role: 'MERCHANT',
      },
      select: { id: true, firstName: true, email: true },
    });

    // Restore the merchant
    const restoredMerchant = await prisma.business.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        onboardingStatus: 'ACTIVE',
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Log the restoration
    await createAuditLog(
      session.userId,
      'Business',
      id,
      'MERCHANT_RESTORED',
      {
        adminEmail: adminUser.email,
        businessName: merchant.name,
        timestamp: new Date().toISOString(),
      }
    );

    // Notify merchant users
    for (const user of merchantUsers) {
      try {
        await createNotification(
          user.id,
          `Your ${merchant.name} account has been restored and reactivated. You can now access your dashboard.`,
          null,
          'EMAIL_VERIFICATION', // Using existing template
          {
            firstName: user.firstName,
            businessName: merchant.name,
            verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@sjfulfillment.com',
          }
        );
      } catch (notificationError) {
        console.error('Failed to send restoration notification:', notificationError);
      }
    }

    return NextResponse.json({
      message: 'Merchant restored successfully',
      merchant: restoredMerchant,
    });

  } catch (error) {
    console.error('Restore merchant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}