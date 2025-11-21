import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, encrypt } from '@/lib/auth';
import { SignJWT } from 'jose';
import { z } from 'zod';

const secretKey = process.env.JWT_SECRET || 'your-secret-key';
const key = new TextEncoder().encode(secretKey);

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 403 }
      );
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Create temporary token for MFA verification using JOSE
      const tempToken = await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('10m') // 10 minutes to complete MFA
        .sign(key);

      return NextResponse.json({
        success: true,
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required'
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      }
    });

    // Create JWT token using our auth library
    const token = await encrypt({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId || undefined
    });

    console.log('✅ Login successful for user:', user.email);
    console.log('🍪 Creating session token...');

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        businessId: user.businessId,
        business: user.Business_User_businessIdToBusiness
      }
    });

    // Set cookie
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    console.log('🍪 Auth cookie set successfully');
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}