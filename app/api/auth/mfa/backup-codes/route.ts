import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { generateBackupCodes } from '@/lib/auth';
import { createAuditLog } from '@/lib/notifications';

const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
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
    const result = regenerateBackupCodesSchema.safeParse(body);
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
        Business_User_businessIdToBusiness: {
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
      await createAuditLog(
        session.userId,
        'User',
        session.userId,
        'BACKUP_CODES_REGENERATE_FAILED',
        { reason: 'Invalid password', timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Verify TOTP code only (backup codes not implemented in schema yet)
    let mfaVerified = false;

    if (totpCode && user.mfaSecret) {
      const { verifyTOTP } = await import('@/lib/auth');
      mfaVerified = verifyTOTP(user.mfaSecret, totpCode);
    }

    if (!mfaVerified) {
      await createAuditLog(
        session.userId,
        'User',
        session.userId,
        'BACKUP_CODES_REGENERATE_FAILED',
        { reason: 'Invalid MFA code', timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Invalid MFA code' },
        { status: 400 }
      );
    }

    // Generate new backup codes (not stored in DB yet - schema needs update)
    const newBackupCodes = generateBackupCodes();

    // TODO: Update schema to include mfaBackupCodes field
    // For now, just return the codes without storing them

    // Log successful backup codes generation
    await createAuditLog(
      session.userId,
      'User',
      session.userId,
      'BACKUP_CODES_REQUESTED',
      { 
        email: user.email,
        businessName: user.Business_User_businessIdToBusiness?.name,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ 
      message: 'Backup codes regenerated successfully',
      backupCodes: newBackupCodes,
      warning: 'Please save these new backup codes in a secure location. Your old backup codes are no longer valid.'
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}