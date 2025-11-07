import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while updating warehouse status` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: id },
      data: { status },
    });

    return NextResponse.json({
      message: "Warehouse status updated successfully",
      warehouse,
    });
  } catch (error) {
    console.error("Update warehouse status error:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse status" },
      { status: 500 }
    );
  }
}
