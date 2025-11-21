import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createNotification, createAuditLog } from '@/lib/notifications';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyEmailSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Verify the token
    const verificationToken = await verifyToken(token, 'EMAIL_VERIFICATION');
    
    // Update user as verified
    const updatedUser = await prisma.$transaction(async (tx: any) => {
      // Mark user as verified
      const user = await tx.user.update({
        where: { id: verificationToken.userId },
        data: { 
          isVerified: true,
          updatedAt: new Date()
        },
        include: {
          Business_User_businessIdToBusiness: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });

      // If this is a merchant user, also activate their business
      if (user.role === 'MERCHANT' && user.Business_User_businessIdToBusiness && !user.Business_User_businessIdToBusiness.isActive) {
        await tx.business.update({
          where: { id: user.Business_User_businessIdToBusiness.id },
          data: {
            isActive: true,
            onboardingStatus: 'ACTIVE',
            updatedAt: new Date()
          }
        });
      }

      // Delete the used verification token
      await tx.verificationToken.delete({
        where: { id: verificationToken.id }
      });

      return user;
    });

    // Send welcome notification
    await createNotification(
      updatedUser.id,
      `Your email has been verified! Welcome to SJFulfillment. Your ${updatedUser.Business_User_businessIdToBusiness?.name || 'business'} account is now active and ready to use.`,
      '/dashboard',
      'MERCHANT_WELCOME',
      {
        firstName: updatedUser.firstName,
        businessName: updatedUser.Business_User_businessIdToBusiness?.name || 'Your Business',
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
        supportEmail: 'support@sjfulfillment.com'
      }
    );

    // Create audit log
    await createAuditLog(
      updatedUser.id,
      'User',
      updatedUser.id,
      'EMAIL_VERIFIED',
      {
        email: updatedUser.email,
        verificationMethod: 'EMAIL_TOKEN'
      }
    );

    // Check if this user needs password setup (admin-created merchant/staff/logistics)
    const needsPasswordSetup = (
      updatedUser.lastLoginAt === null && 
      updatedUser.loginCount === 0 &&
      ['MERCHANT', 'STAFF', 'LOGISTICS'].includes(updatedUser.role)
    );
    
    if (needsPasswordSetup) {
      console.log('🔐 Admin-created user needs password setup:', {
        email: updatedUser.email,
        role: updatedUser.role
      });
      
      // Create temporary session for password setup
      const { encrypt } = await import('@/lib/auth');
      const tempToken = await encrypt({
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        businessId: updatedUser.businessId || undefined,
        isTemporarySession: true,
        mustSetPassword: true,
        exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
      });
      
      const response = NextResponse.json({
        success: true,
        message: 'Email verified successfully! Please set your password to continue.',
        requiresPasswordSetup: true,
        redirectTo: '/auth/set-password',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isVerified: true,
          business: updatedUser.Business_User_businessIdToBusiness
        }
      }, { status: 200 });
      
      // Set temporary session cookie
      response.cookies.set('session', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60 // 30 minutes in seconds
      });
      
      console.log('🔐 Temporary session created for password setup');
      return response;
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now pending admin approval.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isVerified: true,
        business: updatedUser.Business_User_businessIdToBusiness
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Email verification error:', error);
    
    // Handle specific error types
    if (error.message === 'TOKEN_EXPIRED') {
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new verification email.' },
        { status: 400 }
      );
    }
    
    if (error.message === 'ALREADY_VERIFIED') {
      return NextResponse.json(
        { error: 'Your email is already verified! You can proceed to login.' },
        { status: 400 }
      );
    }
    
    if (error.message === 'TOKEN_NOT_FOUND_OR_ALREADY_USED') {
      return NextResponse.json(
        { error: 'This verification link has already been used or is invalid. If your email is not verified, please request a new verification email.' },
        { status: 400 }
      );
    }
    
    if (error.message === 'INVALID_TOKEN') {
      return NextResponse.json(
        { error: 'Invalid verification token. Please check your email for the correct link.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        Business_User_businessIdToBusiness: {
          select: {
            name: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address. Please register first.' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Your email is already verified! You can proceed to login.' },
        { status: 400 }
      );
    }

    // Delete existing verification tokens
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION'
      }
    });

    // Generate new verification token
    const { generateVerificationToken } = await import('@/lib/auth');
    const verificationToken = await generateVerificationToken(user.id);

    console.log('🔄 Generated new verification token for resend:', {
      userId: user.id,
      email: user.email,
      token: verificationToken.substring(0, 16) + '...'
    });

    // Send verification email
    await createNotification(
      user.id,
      `Please verify your email address to complete registration.`,
      null,
      'EMAIL_VERIFICATION',
      {
        firstName: user.firstName,
        businessName: user.Business_User_businessIdToBusiness?.name || 'Your Business',
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`,
        supportEmail: 'support@sjfulfillment.com'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully! Please check your inbox.'
    }, { status: 200 });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again later.' },
      { status: 500 }
    );
  }
}