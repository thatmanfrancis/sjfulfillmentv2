// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwt } from "@/lib/jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { message: "Verification token is required" },
        { status: 400 }
      );
    }

    // Verify token
    const payload = await verifyJwt(token);

    console.log("Decoded payload:", payload); // Debug log

    if (!payload || payload.type !== "email_verification") {
      return NextResponse.json(
        { message: "Invalid or expired verification token" },
        { status: 401 }
      );
    }

    // Check if userId exists in payload
    if (!payload.userId) {
      console.error("userId missing from payload:", payload);
      return NextResponse.json(
        { message: "Invalid token payload" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId as string },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Email verified successfully. You can now login.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
      },
    });
  } catch (error: any) {
    console.error("Error verifying email:", error);

    // Handle Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: error?.message || "Email verification failed" },
      { status: 500 }
    );
  }
}
