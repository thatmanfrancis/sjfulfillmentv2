import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { verifyPassword } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while changing password` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "No password set for this account. Use OTP login." },
        { status: 400 }
      );
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const password = await bcrypt.hash(newPassword, 10);
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: password,
        preferredAuthMethod: "PASSWORD", // Switch to password auth
      },
    });

    await prisma.notification.create({
      data: {
        userId: auth.userId as string,
        title: "Password Changed",
        message: "Your account password has been changed successfully.",
        type: "SYSTEM_ALERT",
      },
    });

    return NextResponse.json(
      {
        message: "Password changed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
