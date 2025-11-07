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
    const body = await req.json();
    const { reason } = body;

    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.order.update({
      where: { id: id },
      data: { status: "ON_HOLD" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "ON_HOLD",
        changedBy: auth.userId as string,
        notes: reason || "Order placed on hold",
      },
    });

    return NextResponse.json({
      message: "Order placed on hold successfully",
    });
  } catch (error) {
    console.error("Hold order error:", error);
    return NextResponse.json(
      { error: "Failed to hold order" },
      { status: 500 }
    );
  }
}
