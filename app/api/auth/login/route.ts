import { verifyPassword } from "@/lib/auth";
import { signJwt } from "@/lib/jose";
import { sendMail } from "@/lib/nodemailer";
import { generateOtp } from "@/lib/otp";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
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

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is suspended or banned" },
        { status: 403 }
      );
    }

    // Check if email is verified
    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Please make sure your email verified." },
        { status: 403 }
      );
    }

    // PASSWORD LOGIN
    if (
      user.preferredAuthMethod === "PASSWORD" ||
      user.preferredAuthMethod === "BOTH"
    ) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required for this account" },
          { status: 400 }
        );
      }

      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json(
          { error: "Invalid credentials" },
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

      // Success - generate tokens
      return await generateSuccessResponse(user);
    }

    // OTP LOGIN
    if (user.preferredAuthMethod === "OTP") {
      // Generate and send OTP
      const otpCode = await generateOtp(user.id);

      console.log("OTP Code for", email, "is", otpCode); // For testing purposes

      await sendMail({
        to: email,
        subject: "Your Login Code",
        html: `
          <h1>Login Code</h1>
          <p>Hi ${user.firstName},</p>
          <p>Your login code is: <strong>${otpCode}</strong></p>
          <p>This code expires in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });

      return NextResponse.json({
        requiresOTP: true,
        message: "OTP sent to your email. Please verify using the code.",
        otp: otpCode,
      });
    }

    return NextResponse.json(
      { error: "Invalid authentication method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

async function generateSuccessResponse(user: any) {
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
}
