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
    const { notes, signature } = body;

    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order to delivered
    await prisma.order.update({
      where: { id: id },
      data: { status: "DELIVERED" },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "DELIVERED",
        changedBy: auth.userId as string,
        notes: notes || "Order delivered successfully",
      },
    });

    // Update shipment if exists
    const shipment = await prisma.shipment.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    if (shipment) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          signature,
        },
      });
    }

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: order.customerId,
      merchantId: order.merchantId,
      type: "ORDER_STATUS",
      title: "Order Delivered",
      message: `Your order ${order.orderNumber} has been delivered`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id },
    });

    return NextResponse.json({
      message: "Order marked as delivered successfully",
    });
  } catch (error) {
    console.error("Deliver order error:", error);
    return NextResponse.json(
      { error: "Failed to deliver order" },
      { status: 500 }
    );
  }
}
