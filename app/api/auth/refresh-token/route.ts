import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwt, signJwt } from "@/lib/jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Verify refresh token
    const payload = await verifyJwt(refreshToken);
    if (!payload || payload.type !== "refresh") {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      );
    }

    // Generate new access token
    const accessToken = await signJwt(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      "1h"
    );

    return NextResponse.json({
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
