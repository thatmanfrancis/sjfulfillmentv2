import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { authenticator } from 'otplib';

// PUT /api/user/mfa
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, token } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaSecret: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (enabled) {
      // Enabling MFA
      let secret = user.mfaSecret;
      
      if (!secret) {
        // Generate new secret
        secret = authenticator.generateSecret();
      }

      // If token is provided, verify it
      if (token) {
        // Configure authenticator with proper settings
        authenticator.options = {
          step: 30,
          window: 2, // Allow 2 steps before and after current time
          digits: 6
        };

        const isValid = authenticator.verify({
          token: token.toString().trim(),
          secret
        });

        console.log('MFA Verification:', {
          token: token.toString().trim(),
          secret,
          isValid,
          currentTime: Math.floor(Date.now() / 1000)
        });

        if (!isValid) {
          return NextResponse.json({ 
            success: false,
            error: "Invalid verification code. Please try again." 
          }, { status: 400 });
        }

        // Enable MFA
        const updatedUser = await prisma.user.update({
          where: { id: session.userId },
          data: {
            mfaEnabled: true,
            mfaSecret: secret,
            twoFactorEnabled: true,
            updatedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: 'MFA enabled successfully',
          user: {
            mfaEnabled: updatedUser.mfaEnabled,
            twoFactorEnabled: updatedUser.twoFactorEnabled
          }
        });
      } else {
        // Return QR code data for setup
        const appName = 'SendJon';
        
        // Save the secret to database immediately for consistency
        await prisma.user.update({
          where: { id: session.userId },
          data: {
            mfaSecret: secret,
            updatedAt: new Date()
          }
        });

        const otpauthUrl = authenticator.keyuri(
          user.email,
          appName,
          secret
        );

        return NextResponse.json({
          success: true,
          secret,
          qrCodeUrl: otpauthUrl,
          message: 'Scan QR code with your authenticator app'
        });
      }
    } else {
      // Disabling MFA
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          mfaEnabled: false,
          twoFactorEnabled: false,
          mfaSecret: null,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    }

  } catch (error) {
    console.error('Error toggling MFA:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}