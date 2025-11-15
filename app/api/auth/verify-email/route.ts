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
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Mark user as verified
      const user = await tx.user.update({
        where: { id: verificationToken.userId },
        data: { 
          isVerified: true,
          updatedAt: new Date()
        },
        include: {
          business: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Delete the used verification token
      await tx.verificationToken.delete({
        where: { id: verificationToken.id }
      });

      return user;
    });

    // Send welcome notification
    await createNotification(
      updatedUser.id,
      `Your email has been verified! Welcome to SJFulfillment. Your account is now pending admin approval.`,
      '/dashboard',
      'MERCHANT_WELCOME',
      {
        firstName: updatedUser.firstName,
        businessName: updatedUser.business?.name || 'Your Business',
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

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now pending admin approval.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isVerified: true,
        business: updatedUser.business
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Email verification error:', error);
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
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
        business: {
          select: {
            name: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
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

    // Send verification email
    await createNotification(
      user.id,
      `Please verify your email address to complete registration.`,
      null,
      'EMAIL_VERIFICATION',
      {
        firstName: user.firstName,
        businessName: user.business?.name || 'Your Business',
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`,
        supportEmail: 'support@sjfulfillment.com'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully!'
    }, { status: 200 });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}