import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { authenticator } from "otplib";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while verifying 2FA` }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { message: "Verification code is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { message: "2FA setup not initiated" },
        { status: 400 }
      );
    }

    // Verify code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid verification code" },
        { status: 401 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: auth.userId as string },
      data: {
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "2FA enabled successfully",
    });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return NextResponse.json(
      { message: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
