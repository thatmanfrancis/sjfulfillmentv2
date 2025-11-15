import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/notifications';

const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required to disable MFA'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/, 'TOTP code must contain only numbers').optional(),
  backupCode: z.string().min(1).optional(),
}).refine((data) => data.totpCode || data.backupCode, {
  message: "Either TOTP code or backup code is required",
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

    const body = await request.json();
    
    // Validate the request data
    const result = mfaDisableSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { password, totpCode, backupCode } = result.data;

    // Get user with MFA settings
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        mfaEnabled: true,
        mfaSecret: true,
        firstName: true,
        lastName: true,
        business: {
          select: { name: true }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed MFA disable attempt
      await createAuditLog(
        session.userId,
        'User',
        session.userId,
        'MFA_DISABLE_FAILED',
        { reason: 'Invalid password', timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Verify TOTP code only (backup codes not implemented yet)
    let mfaVerified = false;

    if (totpCode && user.mfaSecret) {
      const { verifyTOTP } = await import('@/lib/auth');
      mfaVerified = verifyTOTP(user.mfaSecret, totpCode);
    }

    if (!mfaVerified) {
      // Log failed MFA disable attempt
      await createAuditLog(
        session.userId,
        'User',
        session.userId,
        'MFA_DISABLE_FAILED',
        { reason: 'Invalid MFA code', timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Invalid MFA code' },
        { status: 400 }
      );
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date(),
      },
    });

    // Log successful MFA disable
    await createAuditLog(
      session.userId,
      'User',
      session.userId,
      'MFA_DISABLED',
      { 
        email: user.email,
        businessName: user.business?.name,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ 
      message: 'MFA disabled successfully'
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}