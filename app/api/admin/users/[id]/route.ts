import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/role";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(req, ["ADMIN"]);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(req, ["ADMIN"]);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        avatarUrl: true,
        ownedMerchants: {
          select: { id: true, businessName: true },
        },
        merchantStaff: {
          select: {
            merchant: { select: { id: true, businessName: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formatted = {
      ...user,
      lastLogin: user.lastLoginAt,
      merchant: user.ownedMerchants[0] || user.merchantStaff[0]?.merchant || null,
    };

    return NextResponse.json({ user: formatted });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
