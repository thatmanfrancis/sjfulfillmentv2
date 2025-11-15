import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, checkRateLimit, clearRateLimit } from '@/lib/auth';
import { createSessionCookie } from '@/lib/session';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
  rememberMe: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') ||
                     'unknown';
    
    // Rate limiting per IP address
    if (!checkRateLimit(clientIP, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: 15 * 60 // 15 minutes
        },
        { status: 429 }
      );
    }

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { email, password, mfaCode, rememberMe } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isVerified) {
      return NextResponse.json(
        { 
          error: 'Please verify your email address before logging in',
          needsEmailVerification: true,
          userId: user.id
        },
        { status: 403 }
      );
    }

    // Check if user's business is active (if they belong to one)
    if (user.business && !user.business.isActive) {
      return NextResponse.json(
        { error: 'Your business account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // MFA check
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return NextResponse.json(
          { 
            error: 'MFA code required',
            needsMfa: true,
            tempToken: 'temp_' + user.id // You'd want to create a proper temp token
          },
          { status: 200 }
        );
      }

      // Verify MFA code (you'd implement this based on your MFA provider)
      const isMfaValid = await verifyMfaCode(user.id, mfaCode);
      if (!isMfaValid) {
        return NextResponse.json(
          { error: 'Invalid MFA code' },
          { status: 401 }
        );
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginCount: {
          increment: 1
        }
      }
    });

    // Clear rate limit on successful login
    clearRateLimit(clientIP);

    // Create session
    const session = await createSessionCookie(user.id);

    // Return user data
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      business: user.business ? {
        id: user.business.id,
        name: user.business.name
      } : null,
      mfaEnabled: user.mfaEnabled
    };

    return NextResponse.json({
      success: true,
      user: userData,
      session: session
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple MFA verification - you'd integrate with your MFA provider
async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  // This is a placeholder - implement based on your MFA solution
  // You might use TOTP, SMS, or backup codes
  
  // For backup codes
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true }
  });

  if (!user?.mfaSecret) return false;

  // Here you'd verify the TOTP code against the secret
  // Or check if it's a valid backup code
  
  return true; // Placeholder
}