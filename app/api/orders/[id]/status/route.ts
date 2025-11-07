import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PATCH(
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
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status
    const updated = await prisma.order.update({
      where: { id: id },
      data: { status },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: status,
        changedBy: auth.userId as string,
        notes,
      },
    });

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: order.customerId,
      merchantId: order.merchantId,
      type: "ORDER_STATUS",
      title: "Order Status Updated",
      message: `Your order ${order.orderNumber} status has been updated to ${status}`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id, status },
    });

    return NextResponse.json({
      message: "Order status updated successfully",
      order: updated,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
