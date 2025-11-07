import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "ON_HOLD") {
      return NextResponse.json(
        { error: "Order is not on hold" },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: id },
      data: { status: "PROCESSING" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "PROCESSING",
        changedBy: auth.userId as string,
        notes: "Order resumed from hold",
      },
    });

    return NextResponse.json({
      message: "Order resumed successfully",
    });
  } catch (error) {
    console.error("Resume order error:", error);
    return NextResponse.json(
      { error: "Failed to resume order" },
      { status: 500 }
    );
  }
}
