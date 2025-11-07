import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while regenerating backup codes` }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: { twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    await prisma.user.update({
      where: { id: auth.userId as string },
      data: { twoFactorBackupCodes: backupCodes },
    });

    return NextResponse.json({
      message: "Backup codes regenerated successfully",
      backupCodes,
    });
  } catch (error) {
    console.error("Regenerate backup codes error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
