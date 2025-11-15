import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { createNotification, createAuditLog } from '@/lib/notifications';

const updateMerchantSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100).optional(),
  businessPhone: z.string().min(10, 'Valid phone number is required').optional(),
  businessAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }).optional(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED']).optional(),
});

// GET specific merchant details
export async function GET(
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
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const merchant = await prisma.business.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
            mfaEnabled: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        Order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            orderDate: true,
          },
          take: 10,
          orderBy: { orderDate: 'desc' },
        },
        _count: {
          select: {
            Order: true,
            staff: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ merchant });

  } catch (error) {
    console.error('Get merchant details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE merchant details
export async function PUT(
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

    const body = await request.json();
    
    // Validate the request data
    const result = updateMerchantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    // Get current merchant data
    const existingMerchant = await prisma.business.findUnique({
      where: { id },
      include: {
        staff: {
          where: { role: 'MERCHANT' },
          select: { id: true, firstName: true, email: true },
        },
      },
    });

    if (!existingMerchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const changes: any = {};

    // Track changes for audit log
    if (result.data.businessName && result.data.businessName !== existingMerchant.name) {
      updateData.name = result.data.businessName;
      changes.businessName = { from: existingMerchant.name, to: result.data.businessName };
    }

    if (result.data.businessPhone && result.data.businessPhone !== existingMerchant.contactPhone) {
      updateData.contactPhone = result.data.businessPhone;
      changes.contactPhone = { from: existingMerchant.contactPhone, to: result.data.businessPhone };
    }

    if (result.data.businessAddress) {
      updateData.address = result.data.businessAddress.street;
      updateData.city = result.data.businessAddress.city;
      updateData.state = result.data.businessAddress.state;
      updateData.country = result.data.businessAddress.country;
      changes.address = { 
        from: { 
          street: existingMerchant.address, 
          city: existingMerchant.city, 
          state: existingMerchant.state, 
          country: existingMerchant.country 
        }, 
        to: result.data.businessAddress 
      };
    }

    if (result.data.status && result.data.status !== existingMerchant.onboardingStatus) {
      updateData.onboardingStatus = result.data.status;
      changes.status = { from: existingMerchant.onboardingStatus, to: result.data.status };
    }

    updateData.updatedAt = new Date();

    // Update merchant
    const updatedMerchant = await prisma.business.update({
      where: { id },
      data: updateData,
      include: {
        staff: {
          where: { role: 'MERCHANT' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log the update
    await createAuditLog(
      session.userId,
      'Business',
      id,
      'MERCHANT_UPDATED',
      {
        adminEmail: adminUser.email,
        businessName: updatedMerchant.name,
        changes,
        timestamp: new Date().toISOString(),
      }
    );

    // Send notification if status changed
    if (changes.status && updatedMerchant.staff.length > 0) {
      const primaryUser = updatedMerchant.staff[0];
      let notificationMessage = '';
      
      switch (result.data.status) {
        case 'ACTIVE':
          notificationMessage = `Your ${updatedMerchant.name} account has been activated and is now ready for use.`;
          break;
        case 'SUSPENDED':
          notificationMessage = `Your ${updatedMerchant.name} account has been suspended. Please contact support for assistance.`;
          break;
        case 'PENDING_VERIFICATION':
          notificationMessage = `Your ${updatedMerchant.name} account status has been updated to pending review.`;
          break;
      }

      if (notificationMessage) {
        try {
          await createNotification(
            primaryUser.id,
            notificationMessage,
            null,
            'EMAIL_VERIFICATION', // Using existing template for now
            {
              firstName: primaryUser.firstName,
              businessName: updatedMerchant.name,
              verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
              supportEmail: process.env.SUPPORT_EMAIL || 'support@sjfulfillment.com',
            }
          );
        } catch (notificationError) {
          console.error('Failed to send status change notification:', notificationError);
          // Continue execution even if notification fails
        }
      }
    }

    return NextResponse.json({
      message: 'Merchant updated successfully',
      merchant: updatedMerchant,
      changes,
    });

  } catch (error) {
    console.error('Update merchant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE merchant (soft delete by suspending)
export async function DELETE(
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

    const merchant = await prisma.business.findUnique({
      where: { id },
      include: {
        staff: {
          where: { role: 'MERCHANT' },
          select: { id: true, firstName: true, email: true },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Suspend instead of hard delete
    const suspendedMerchant = await prisma.business.update({
      where: { id },
      data: {
        onboardingStatus: 'SUSPENDED',
        updatedAt: new Date(),
      },
    });

    // Log the suspension
    await createAuditLog(
      session.userId,
      'Business',
      id,
      'MERCHANT_SUSPENDED',
      {
        adminEmail: adminUser.email,
        businessName: merchant.name,
        reason: 'Admin deletion/suspension',
        timestamp: new Date().toISOString(),
      }
    );

    // Notify merchant users
    for (const user of merchant.staff) {
      try {
        await createNotification(
          user.id,
          `Your ${merchant.name} account has been suspended. Please contact support for assistance.`,
          null,
          'EMAIL_VERIFICATION', // Using existing template
          {
            firstName: user.firstName,
            businessName: merchant.name,
            verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@sjfulfillment.com',
          }
        );
      } catch (notificationError) {
        console.error('Failed to send suspension notification:', notificationError);
      }
    }

    return NextResponse.json({
      message: 'Merchant suspended successfully',
      merchant: suspendedMerchant,
    });

  } catch (error) {
    console.error('Suspend merchant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}