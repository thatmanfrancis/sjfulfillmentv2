import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/nodemailer";
import { signJwt } from "@/lib/jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email, firstName, lastName, phone, role, currency } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        {
          message: `Missing required fields ${
            !email ? "email" : !firstName ? "firstName" : "lastName"
          }`,
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: `user with email ${email} already exists` },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        role: role || "MERCHANT", // Default to MERCHANT if no role provided

        preferredAuthMethod: "OTP",
        status: "ACTIVE",
      },
    });

    const verificationToken = await signJwt(
      { userId: user.id, type: "email_verification" },
      "1d"
    );

    const verificationUrl: string = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${verificationToken}`;

    await sendMail({
      to: user.email,
      subject: "Verify your email",
      html: `
        <h1>Welcome to Our Platform!</h1>
        <p>Hi ${firstName},</p>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return NextResponse.json(
      {
        message: `User registered successfully. Please check your email (spam folder included) to verify your account.`,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`Registration error: ${error?.message}`);

    return NextResponse.json(
      { message: `Internal server error: ${error?.message}` },
      { status: 500 }
    );
  }
}
