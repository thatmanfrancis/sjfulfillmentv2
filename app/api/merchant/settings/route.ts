import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";


export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role and businessId from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, businessId: true }
    });


    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // The Setting model does not have businessId, but User does. Filter by userId or another valid field.
    const where: any = { updatedById: session.userId };
    if (key) where.key = { contains: key };

    const settings = await prisma.setting.findMany({
      where,
      orderBy: { key: "asc" },
    });

    // Fetch merchant (user) details
    const merchant = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        department: true,
        position: true,
        location: true,
        profileImage: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        smsNotifications: true,
        mfaEnabled: true,
        twoFactorEnabled: true,
        role: true,
        createdAt: true,
      },
    });

    // Fetch business details
    let business = null;
    if (user.businessId) {
      business = await prisma.business.findUnique({ where: { id: user.businessId } });
    }

    return NextResponse.json({
      settings,
      merchant,
      business,
      summary: {
        totalSettings: settings.length,
      },
    });
  } catch (error) {
    console.error("Error fetching merchant settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
