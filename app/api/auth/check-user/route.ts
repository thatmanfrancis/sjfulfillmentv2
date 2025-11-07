import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        preferredAuthMethod: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
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
        { error: "Please verify your email address first" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      exists: true,
      firstName: user.firstName,
      preferredAuthMethod: user.preferredAuthMethod,
      message: `Hi ${user.firstName}! Please continue with your login.`,
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json(
      { error: "Failed to check user" },
      { status: 500 }
    );
  }
}