import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({message: `Error occurred while updating permissions` }, { status: 400 });
  }

  try {
    const { staffId, id } = await params;
    const body = await req.json();
    const { permissions } = body;

    if (!permissions || typeof permissions !== "object") {
      return NextResponse.json(
        { error: "Permissions must be an object" },
        { status: 400 }
      );
    }

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
      data: { permissions },
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
      message: "Permissions updated successfully",
      staff: updated,
    });
  } catch (error) {
    console.error("Update permissions error:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}