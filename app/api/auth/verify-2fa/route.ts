import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwt, signJwt } from "@/lib/jose";
import { authenticator } from "otplib";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "Temp token and 2FA code are required" },
        { status: 400 }
      );
    }

    // Verify temp token
    const payload = await verifyJwt(tempToken);
    if (!payload || payload.type !== "2fa_pending") {
      return NextResponse.json(
        { error: "Invalid or expired temp token" },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not configured for this user" },
        { status: 400 }
      );
    }

    // Verify 2FA code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      // Check backup codes
      if (user.twoFactorBackupCodes) {
        const backupCodes = user.twoFactorBackupCodes as string[];
        const codeIndex = backupCodes.indexOf(code);

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorBackupCodes: backupCodes },
          });
        } else {
          return NextResponse.json(
            { error: "Invalid 2FA code" },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Invalid 2FA code" },
          { status: 401 }
        );
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = await signJwt(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      "1h"
    );

    const refreshToken = await signJwt(
      { userId: user.id, type: "refresh" },
      "7d"
    );

    return NextResponse.json({
      message: "2FA verification successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "2FA verification failed" },
      { status: 500 }
    );
  }
}
