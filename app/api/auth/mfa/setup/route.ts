import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { generateTOTPSecret, generateBackupCodes } from '@/lib/auth';
import { createAuditLog } from '@/lib/notifications';

const mfaSetupSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/, 'TOTP code must contain only numbers'),
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

    // Check if user already has MFA enabled
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
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

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate the request data
    const result = mfaSetupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { totpCode } = result.data;

    // Generate TOTP secret and backup codes
    const totpSecret = generateTOTPSecret();
    const backupCodes = generateBackupCodes();

    // Verify the provided TOTP code against the generated secret
    const { verifyTOTP } = await import('@/lib/auth');
    const isValidTOTP = verifyTOTP(totpSecret, totpCode);
    
    if (!isValidTOTP) {
      return NextResponse.json(
        { error: 'Invalid TOTP code. Please check your authenticator app and try again.' },
        { status: 400 }
      );
    }

    // Update user with MFA settings (without backup codes for now)
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        mfaEnabled: true,
        mfaSecret: totpSecret,
        updatedAt: new Date(),
      },
    });

    // Log successful MFA setup
    await createAuditLog(
      session.userId,
      'User',
      session.userId,
      'MFA_ENABLED',
      { 
        email: user.email,
        businessName: user.business?.name,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ 
      message: 'MFA enabled successfully',
      backupCodes: backupCodes, // Return codes but note they're not stored yet
      warning: 'Please save these backup codes in a secure location. Note: Backup code storage requires schema update.'
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to generate QR code for TOTP setup
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user already has MFA enabled
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
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

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 400 }
      );
    }

    // Generate temporary TOTP secret for setup
    const totpSecret = generateTOTPSecret();
    const businessName = user.business?.name || 'SJFulfillment';
    
    // Generate QR code URL
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(businessName)}:${encodeURIComponent(user.email)}?secret=${totpSecret}&issuer=${encodeURIComponent('SJFulfillment')}`;

    return NextResponse.json({ 
      totpSecret,
      qrCodeUrl,
      manualEntryKey: totpSecret,
      instructions: 'Scan the QR code with your authenticator app or manually enter the key. Then provide a 6-digit code to complete setup.'
    });

  } catch (error) {
    console.error('MFA setup preparation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}