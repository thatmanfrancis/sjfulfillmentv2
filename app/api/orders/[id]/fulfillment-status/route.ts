import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { fulfillmentStatus } = body;

    if (!fulfillmentStatus) {
      return NextResponse.json(
        { error: "Fulfillment status is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: id },
      data: { fulfillmentStatus },
    });

    return NextResponse.json({
      message: "Fulfillment status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update fulfillment status error:", error);
    return NextResponse.json(
      { error: "Failed to update fulfillment status" },
      { status: 500 }
    );
  }
}
