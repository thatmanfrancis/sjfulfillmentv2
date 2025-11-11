import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Authentication required` }, { status: 401 });
  }

  try {
    const userIdStr = String(auth.userId);
    const profile = await prisma.logisticsProfile.findUnique({ where: { userId: userIdStr } as any, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } } });
    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get logistics profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Authentication required` }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { coverageStates, capacity, active, firstName, lastName, phone, avatarUrl } = body;

    // Upsert logistics profile
    const userIdStr = String(auth.userId);
    const up = await prisma.logisticsProfile.upsert({
      where: { userId: userIdStr } as any,
      create: {
        userId: userIdStr,
        coverageStates: coverageStates || [],
        capacity: capacity ?? 4,
        active: active ?? true,
      },
      update: {
        ...(coverageStates !== undefined && { coverageStates }),
        ...(capacity !== undefined && { capacity }),
        ...(active !== undefined && { active }),
      },
    });

    // Update basic user info
  await prisma.user.update({ where: { id: userIdStr }, data: { ...(firstName && { firstName }), ...(lastName && { lastName }), ...(phone && { phone }), ...(avatarUrl && { avatarUrl }) } });

    return NextResponse.json({ message: "Profile updated", profile: up });
  } catch (error) {
    console.error("Update logistics profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
