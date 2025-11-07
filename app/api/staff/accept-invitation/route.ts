import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while accepting invitation` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const staff = await prisma.merchantStaff.findUnique({
      where: { id: staffId },
      include: {
        merchant: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (staff.userId !== auth.userId) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      );
    }

    if (staff.status !== "INVITED") {
      return NextResponse.json(
        { error: "Invitation already processed" },
        { status: 400 }
      );
    }

    // Accept invitation
    const updated = await prisma.merchantStaff.update({
      where: { id: staffId },
      data: {
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `You've successfully joined ${staff.merchant.businessName}`,
      staff: updated,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
