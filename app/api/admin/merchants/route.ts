import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { createNotification, createAuditLog } from '@/lib/notifications';
import { generateRandomPassword } from '@/lib/auth';

const createMerchantSchema = z.object({
  // Business Information
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessPhone: z.string().min(10, 'Valid phone number is required'),
  businessAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  
  // Primary Contact (Admin User)
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  
  // Business Settings
  currency: z.enum(['USD', 'NGN']).default('USD'),
});

export async function POST(request: NextRequest) {
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
    const result = createMerchantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      businessName,
      businessPhone,
      businessAddress,
      firstName,
      lastName,
      email,
      currency,
    } = result.data;

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 400 }
      );
    }

    // Check if business name is already in use
    const existingBusiness = await prisma.business.findUnique({
      where: { name: businessName },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'Business name is already in use' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create the merchant account in a transaction
    const result_transaction = await prisma.$transaction(async (prisma) => {
      // Create business
      const business = await prisma.business.create({
        data: {
          name: businessName,
          contactPhone: businessPhone,
          address: businessAddress.street,
          city: businessAddress.city,
          state: businessAddress.state,
          country: businessAddress.country,
          baseCurrency: currency,
          onboardingStatus: 'PENDING_VERIFICATION', // Admin-created accounts start as pending
        },
      });

      // Create admin user for the business
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: 'MERCHANT',
          isVerified: true, // Admin-created accounts are pre-verified
          businessId: business.id,
        },
      });

      return { business, user };
    });

    // Send welcome email with credentials
    await createNotification(
      result_transaction.user.id,
      `Welcome to SJFulfillment! Your ${businessName} account has been set up.`,
      null,
      'MERCHANT_WELCOME',
      {
        businessName,
        email,
        password: temporaryPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      }
    );

    // Log the merchant creation
    await createAuditLog(
      session.userId,
      'Business',
      result_transaction.business.id,
      'MERCHANT_CREATED',
      {
        adminEmail: adminUser.email,
        businessName,
        merchantEmail: email,
        currency,
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      message: 'Merchant account created successfully',
      merchant: {
        businessId: result_transaction.business.id,
        businessName,
        userId: result_transaction.user.id,
        email,
        temporaryPassword, // Include in response for admin reference
      },
      note: 'Welcome email has been sent to the merchant with login credentials.',
    }, { status: 201 });

  } catch (error) {
    console.error('Merchant creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list merchants (with pagination)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | null;
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { users: { some: { firstName: { contains: search, mode: 'insensitive' } } } },
        { users: { some: { lastName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    // Get merchants with pagination
    const [merchants, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        include: {
          staff: {
            where: { role: 'MERCHANT' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isVerified: true,
              mfaEnabled: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.business.count({ where }),
    ]);

    return NextResponse.json({
      merchants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Get merchants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}