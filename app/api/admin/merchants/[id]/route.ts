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

        const business = await prisma.business.findUnique({
      where: { 
        id,
        deletedAt: null // Exclude soft-deleted merchants
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        baseCurrency: true,
        isActive: true,
        onboardingStatus: true,
        address: true,
        city: true,
        contactPhone: true,
        country: true,
        state: true,
        createdAt: true,
        updatedAt: true,
        User_User_businessIdToBusiness: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
            mfaEnabled: true,
            createdAt: true,
            lastLoginAt: true,
            role: true,
          },
        },
        Order: {
          take: 50, // Limit to recent orders
          orderBy: { orderDate: 'desc' },
          select: {
            id: true,
            externalOrderId: true,
            customerName: true,
            customerPhone: true,
            customerAddress: true,
            totalAmount: true,
            status: true,
            orderDate: true,
          }
        },
        Product: {
          take: 100, // Limit products
          select: {
            id: true,
            sku: true,
            name: true,
            weightKg: true,
            imageUrl: true,
          }
        }
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Calculate stats
    const totalRevenue = business.Order.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
    const totalOrders = business.Order.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const activeProducts = business.Product.length; // All selected products are active

    // Transform business data to match frontend expectations
    const merchantData = {
      id: business.id,
      name: business.name,
      description: null, // Not in schema
      contactEmail: business.contactPhone || 'N/A',
      contactPhone: business.contactPhone,
      address: business.address,
      city: business.city,
      state: business.state,
      postalCode: null, // Not in schema
      country: business.country,
      website: null, // Not in schema
      isActive: business.isActive,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
      staff: business.User_User_businessIdToBusiness,
      orders: business.Order,
      products: business.Product,
      stats: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        totalProducts: business.Product.length,
        activeProducts,
        totalStaff: business.User_User_businessIdToBusiness.length,
      }
    };

    return NextResponse.json({
      merchant: merchantData
    }, { status: 200 });

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
      where: { 
        id,
        deletedAt: null // Exclude soft-deleted merchants
      },
      include: {
        User_User_businessIdToBusiness: {
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
      // Sync isActive with onboardingStatus
      updateData.isActive = result.data.status === 'ACTIVE';
      changes.status = { from: existingMerchant.onboardingStatus, to: result.data.status };
      changes.isActive = { from: existingMerchant.isActive, to: result.data.status === 'ACTIVE' };
    }

    updateData.updatedAt = new Date();

    // Update merchant
    const updatedMerchant = await prisma.business.update({
      where: { id },
      data: updateData,
      include: {
        User_User_businessIdToBusiness: {
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
    if (changes.status && updatedMerchant.User_User_businessIdToBusiness.length > 0) {
      const primaryUser = updatedMerchant.User_User_businessIdToBusiness[0];
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
      where: { 
        id,
        deletedAt: null // Exclude already soft-deleted merchants
      },
      include: {
        User_User_businessIdToBusiness: {
          where: { role: 'MERCHANT' },
          select: { id: true, firstName: true, email: true },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found or already deleted' },
        { status: 404 }
      );
    }

    // Implement soft delete instead of just suspending
    const deletedMerchant = await prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.userId,
        onboardingStatus: 'SUSPENDED',
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log the soft delete
    await createAuditLog(
      session.userId,
      'Business',
      id,
      'MERCHANT_SOFT_DELETED',
      {
        adminEmail: adminUser.email,
        businessName: merchant.name,
        reason: 'Admin soft deletion',
        timestamp: new Date().toISOString(),
      }
    );

    // Notify merchant users
    for (const user of merchant.User_User_businessIdToBusiness) {
      try {
        await createNotification(
          user.id,
          `Your ${merchant.name} account has been suspended and marked for deletion. Please contact support for assistance.`,
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
        console.error('Failed to send deletion notification:', notificationError);
      }
    }

    return NextResponse.json({
      message: 'Merchant soft deleted successfully',
      merchant: deletedMerchant,
    });

  } catch (error) {
    console.error('Suspend merchant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}