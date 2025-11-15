import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePasswordResetToken, checkRateLimit } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limiting for password reset requests
    if (!checkRateLimit(`reset-${clientIP}`, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      return NextResponse.json(
        { 
          error: 'Too many password reset requests. Please try again later.',
          retryAfter: 3600 // 1 hour
        },
        { status: 429 }
      );
    }

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

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

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      try {
        // Generate password reset token
        const resetToken = await generatePasswordResetToken(email.toLowerCase());

        // Send password reset email
        await createNotification(
          user.id,
          `A password reset was requested for your account. If this wasn't you, please ignore this email.`,
          null,
          'PASSWORD_RESET',
          {
            firstName: user.firstName,
            businessName: user.business?.name || 'Your Business',
            resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`,
            supportEmail: 'support@sjfulfillment.com',
            expiryMinutes: 30
          }
        );

        console.log(`Password reset email sent to ${email}`);
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        // Don't expose the error to the user for security reasons
      }
    } else {
      console.log(`Password reset requested for non-existent email: ${email}`);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}