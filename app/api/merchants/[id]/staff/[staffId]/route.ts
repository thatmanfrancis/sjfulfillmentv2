import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching staff details` },
      { status: 400 }
    );
  }

  try {
    const { staffId, id } = await params;
    const staff = await prisma.merchantStaff.findFirst({
      where: {
        id: staffId,
        merchantId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            status: true,
            lastLoginAt: true,
          },
        },
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Get staff details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating staff` },
      { status: 400 }
    );
  }

  try {
    const { staffId, id } = await params;
    const body = await req.json();
    const { role, permissions } = body;

    const staff = await prisma.merchantStaff.findFirst({
      where: {
        id: staffId,
        merchantId: id,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.merchantStaff.update({
      where: { id: staffId },
      data: {
        ...(role && { role }),
        ...(permissions && { permissions }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Staff updated successfully",
      staff: updated,
    });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json(
      { error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while removing staff` },
      { status: 400 }
    );
  }

  try {
    const { staffId, id } = await params;
    const staff = await prisma.merchantStaff.findFirst({
      where: {
        id: staffId,
        merchantId: id,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Delete staff record
    await prisma.merchantStaff.delete({
      where: { id: staffId },
    });

    return NextResponse.json({
      message: "Staff removed successfully",
    });
  } catch (error) {
    console.error("Remove staff error:", error);
    return NextResponse.json(
      { error: "Failed to remove staff" },
      { status: 500 }
    );
  }
}