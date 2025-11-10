import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/nodemailer";
import { signJwt } from "@/lib/jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = await signJwt(
      { userId: user.id, type: "email_verification" },
      "7d" // 7 days expiry
    );

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ""}/verify-email?token=${verificationToken}`;
    await sendMail({
      to: email,
      subject: "Verify Your Email",
      html: `
        <h1>Email Verification</h1>
        <p>Hi ${user.firstName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f08c17; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
        <p>This link expires in 7 days.</p>
      `,
    });

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
