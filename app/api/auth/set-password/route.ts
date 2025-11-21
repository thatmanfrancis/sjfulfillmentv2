import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, encrypt, decrypt } from '@/lib/auth';
import { z } from 'zod';

const setPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify temporary session token using decrypt
    let session;
    try {
      session = await decrypt(sessionToken);
      
      // Must be a temporary session for first-time password setup
      if (!session.isTemporarySession || !session.mustSetPassword) {
        return NextResponse.json(
          { error: 'Invalid session for password reset' },
          { status: 403 }
        );
      }

      // Only allow MERCHANT, STAFF, and LOGISTICS roles to set passwords
      if (!['MERCHANT', 'STAFF', 'LOGISTICS'].includes(session.role)) {
        return NextResponse.json(
          { error: 'Access denied. Password setup is only available for merchant, staff, and logistics accounts.' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = setPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { newPassword } = validationResult.data;

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password and mark login
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        businessId: true,
        Business_User_businessIdToBusiness: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create new permanent session token using encrypt
    const permanentToken = await encrypt({
      userId: session.userId,
      email: session.email,
      role: session.role,
      businessId: session.businessId || undefined
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password set successfully! Welcome to your dashboard.',
      user: updatedUser,
      redirectTo: undefined // Let client-side routing handle the dashboard
    });

    // Set permanent session cookie
    response.cookies.set('session', permanentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}