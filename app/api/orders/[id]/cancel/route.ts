import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching user authentication` },
      { status: 400 }
    );
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

    // Can only cancel if not shipped/delivered
    if (["SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot cancel order that has been shipped or delivered" },
        { status: 400 }
      );
    }

    // Update order to cancelled
    await prisma.order.update({
      where: { id: id },
      data: { status: "CANCELLED" },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "CANCELLED",
        changedBy: auth.userId as string,
        notes: reason || "Order cancelled",
      },
    });

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: order.customerId,
      merchantId: order.merchantId,
      type: "ORDER_STATUS",
      title: "Order Cancelled",
      message: `Your order ${order.orderNumber} has been cancelled`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id, reason },
    });

    return NextResponse.json({
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
