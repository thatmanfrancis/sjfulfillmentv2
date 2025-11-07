import { signJwt } from "@/lib/jose";
import { verifyOtp } from "@/lib/otp";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    console.log(`[VERIFY-OTP] Request body:`, { email, otp: otp ? `"${otp}"` : 'undefined' });

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

   

    // Verify OTP
    const otpValid = await verifyOtp(user.id, otp);
    console.log(`[VERIFY-OTP] OTP verification result: ${otpValid}`);

    if (!otpValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const tempToken = await signJwt(
        { userId: user.id, type: "2fa_pending" },
        "10m"
      );

      return NextResponse.json({
        requiresTwoFactor: true,
        tempToken,
        message: "Please provide your 2FA code",
      });
    }

    // Success - Update last login
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
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "OTP verification failed" },
      { status: 500 }
    );
  }
}
