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
    const { trackingNumber, carrier, notes } = body;

    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order to shipped
    await prisma.order.update({
      where: { id: id },
      data: { status: "SHIPPED" },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "SHIPPED",
        changedBy: auth.userId as string,
        notes: notes || `Shipped via ${carrier}. Tracking: ${trackingNumber}`,
      },
    });

    // Create shipment record if tracking info provided
    if (trackingNumber) {
      await prisma.shipment.create({
        data: {
          orderId: id,
          trackingNumber,
          carrier,
          status: "PICKED_UP",
          shippedAt: new Date(),
        },
      });
    }

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: order.customerId,
      merchantId: order.merchantId,
      type: "SHIPMENT_UPDATE",
      title: "Order Shipped",
      message: `Your order ${order.orderNumber} has been shipped${
        trackingNumber ? `. Tracking: ${trackingNumber}` : ""
      }`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id, trackingNumber },
    });

    return NextResponse.json({
      message: "Order marked as shipped successfully",
    });
  } catch (error) {
    console.error("Ship order error:", error);
    return NextResponse.json(
      { error: "Failed to ship order" },
      { status: 500 }
    );
  }
}
