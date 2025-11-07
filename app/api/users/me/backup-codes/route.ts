import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching backup codes` }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      backupCodes: user.twoFactorBackupCodes || [],
    });
  } catch (error) {
    console.error("Get backup codes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch backup codes" },
      { status: 500 }
    );
  }
}
