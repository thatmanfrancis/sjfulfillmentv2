import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while updating return` }, { status: 400 });
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

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status,
        processedBy: auth.userId as string,
      },
    });

    return NextResponse.json({
      message: "Return status updated successfully",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Update return status error:", error);
    return NextResponse.json(
      { error: "Failed to update return status" },
      { status: 500 }
    );
  }
}
