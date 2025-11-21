import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSessionCookie } from '@/lib/session';
import { authenticator } from 'otplib';
import { jwtVerify } from 'jose';
import { encrypt } from '@/lib/auth';

const secretKey = process.env.JWT_SECRET || 'your-secret-key';
const key = new TextEncoder().encode(secretKey);

// POST /api/auth/verify-mfa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, mfaToken } = body;

    if (!tempToken || !mfaToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Verify the temporary token
    let decoded;
    try {
      const { payload } = await jwtVerify(tempToken, key);
      decoded = payload as { userId: string };
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired session. Please login again.'
      }, { status: 401 });
    }

    const { userId } = decoded;

    // Get user with MFA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
        isVerified: true,
        businessId: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (!user.isVerified) {
      return NextResponse.json({
        success: false,
        error: 'Account is not verified'
      }, { status: 403 });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({
        success: false,
        error: 'MFA is not enabled for this account'
      }, { status: 400 });
    }

    // Configure authenticator with proper settings
    authenticator.options = {
      step: 30,
      window: 2, // Allow 2 steps before and after current time
      digits: 6
    };

    // Verify the MFA token
    const isValid = authenticator.verify({
      token: mfaToken.toString().trim(),
      secret: user.mfaSecret
    });

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid verification code. Please try again.'
      }, { status: 400 });
    }

    // Create session for successful MFA verification
    const sessionToken = await encrypt({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId || undefined
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      }
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'MFA verification successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessId: user.businessId
      }
    });

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return response;

  } catch (error) {
    console.error('Error verifying MFA:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}