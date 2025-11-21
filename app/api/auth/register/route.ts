import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateVerificationToken } from '@/lib/auth';
import { createNotification, createAuditLog } from '@/lib/notifications';
import { z } from 'zod';

const registerSchema = z.object({
  // User details
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  confirmPassword: z.string(),
  
  // Business details
  businessName: z.string().min(2, 'Business name is required'),
  contactPhone: z.string().min(10, 'Valid phone number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().default('Nigeria'),
  
  // Personal details
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  
  // Terms
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms and conditions'),
  acceptPrivacyPolicy: z.boolean().refine(val => val === true, 'Must accept privacy policy')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Registration attempt with data:', { ...body, password: '[REDACTED]' });
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.format());
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      businessName,
      contactPhone,
      address,
      city,
      state,
      country,
      firstName,
      lastName
    } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check if business name already exists
    const existingBusiness = await prisma.business.findFirst({
      where: { name: { equals: businessName, mode: 'insensitive' } }
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'Business name already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create business and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create business first (without owner initially)
      const business = await tx.business.create({
        data: {
          id: crypto.randomUUID(),
          name: businessName,
          contactPhone,
          address,
          city,
          state,
          country,
          isActive: false, // Requires admin approval
          onboardingStatus: 'PENDING_VERIFICATION',
          updatedAt: new Date()
        }
      });

      // 2. Create user with business relationship
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          role: 'MERCHANT',
          businessId: business.id,
          isVerified: false,
          firstName,
          lastName,
          updatedAt: new Date()
        }
      });

      // 3. Update business with owner relationship
      await tx.business.update({
        where: { id: business.id },
        data: { ownerId: user.id }
      });

      // 4. Create default pricing (USD primary, NGN for local calculations)
      console.log('Creating pricing tiers for business:', business.id);
      const USD_TO_NGN_RATE = 1650; // In production, fetch from API
      const baseStorageFeeUSD = 0.50;
      const baseFulfillmentFeeUSD = 2.00;
      const baseReceivingFeeUSD = 0.25;

      await tx.pricingTier.create({
        data: {
          id: crypto.randomUUID(),
          merchantId: business.id,
          serviceType: 'WAREHOUSING_MONTHLY',
          baseRate: baseStorageFeeUSD,
          negotiatedRate: baseStorageFeeUSD,
          rateUnit: 'PER_UNIT_MONTH',
          currency: 'USD',
          updatedAt: new Date()
        }
      });

      await tx.pricingTier.create({
        data: {
          id: crypto.randomUUID(),
          merchantId: business.id,
          serviceType: 'FULFILLMENT_PER_ORDER',
          baseRate: baseFulfillmentFeeUSD,
          negotiatedRate: baseFulfillmentFeeUSD,
          rateUnit: 'PER_ORDER',
          currency: 'USD',
          updatedAt: new Date()
        }
      });

      await tx.pricingTier.create({
        data: {
          id: crypto.randomUUID(),
          merchantId: business.id,
          serviceType: 'RECEIVING_FEE',
          baseRate: baseReceivingFeeUSD,
          negotiatedRate: baseReceivingFeeUSD,
          rateUnit: 'PER_UNIT',
          currency: 'USD',
          updatedAt: new Date()
        }
      });

      // NGN pricing for local calculations
      await tx.pricingTier.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            merchantId: business.id,
            serviceType: 'WAREHOUSING_MONTHLY',
            baseRate: baseStorageFeeUSD * USD_TO_NGN_RATE,
            negotiatedRate: baseStorageFeeUSD * USD_TO_NGN_RATE,
            rateUnit: 'PER_UNIT_MONTH',
            currency: 'NGN',
            updatedAt: new Date()
          },
          {
            id: crypto.randomUUID(),
            merchantId: business.id,
            serviceType: 'FULFILLMENT_PER_ORDER',
            baseRate: baseFulfillmentFeeUSD * USD_TO_NGN_RATE,
            negotiatedRate: baseFulfillmentFeeUSD * USD_TO_NGN_RATE,
            rateUnit: 'PER_ORDER',
            currency: 'NGN',
            updatedAt: new Date()
          },
          {
            id: crypto.randomUUID(),
            merchantId: business.id,
            serviceType: 'RECEIVING_FEE',
            baseRate: baseReceivingFeeUSD * USD_TO_NGN_RATE,
            negotiatedRate: baseReceivingFeeUSD * USD_TO_NGN_RATE,
            rateUnit: 'PER_UNIT',
            currency: 'NGN',
            updatedAt: new Date()
          }
        ]
      });

      return { user, business };
    });

    console.log('Transaction completed successfully for user:', result.user.email);

    // Generate email verification token
    const verificationToken = await generateVerificationToken(result.user.id);
    console.log('Generated verification token for user:', result.user.id);

    // Send verification email
    await createNotification(
      result.user.id,
      `Welcome to SJFulfillment! Please verify your email address to complete registration.`,
      null,
      'EMAIL_VERIFICATION',
      {
        firstName,
        businessName,
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`,
        supportEmail: 'support@sjfulfillment.com'
      }
    );

    // Create audit log
    await createAuditLog(
      result.user.id,
      'Business',
      result.business.id,
      'BUSINESS_REGISTERED',
      {
        businessName,
        email: email.toLowerCase(),
        registrationMethod: 'SELF_REGISTRATION'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: result.user.id,
        email: result.user.email,
        businessName: result.business.name,
        requiresEmailVerification: true
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Check if it's a Prisma error
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as any;
      
      if (prismaError.code === 'P2002') {
        // Unique constraint violation
        const target = prismaError.meta?.target?.[0];
        if (target === 'email') {
          return NextResponse.json(
            { error: 'Email address already exists' },
            { status: 409 }
          );
        }
        if (target === 'name') {
          return NextResponse.json(
            { error: 'Business name already taken' },
            { status: 409 }
          );
        }
      }
      
      if (prismaError.code === 'P2003') {
        // Foreign key constraint violation
        return NextResponse.json(
          { error: 'Invalid reference data' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error during registration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}