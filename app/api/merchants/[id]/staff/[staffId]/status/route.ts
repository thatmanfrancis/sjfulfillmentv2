import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while updating staff status` }, { status: 400 });
  }

  try {
    const { staffId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const staff = await prisma.merchantStaff.update({
      where: { id: staffId },
      data: { status },
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
      message: "Staff status updated successfully",
      staff,
    });
  } catch (error) {
    console.error("Update staff status error:", error);
    return NextResponse.json(
      { error: "Failed to update staff status" },
      { status: 500 }
    );
  }
}