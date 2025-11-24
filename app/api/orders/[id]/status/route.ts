import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { status } = await req.json();
    const orderId = id;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Build where clause for business filter
    const where: any = { id: orderId };

    // Add business filter for merchants
    if (session.role !== "ADMIN") {
      where.businessId = session.businessId;
    }

    const order = await prisma.order.update({
      where,
      data: {
        status: status.toUpperCase(),
      },
    });

    // Create notification for merchant users on any status update
    const statusTitles: Record<string, string> = {
      NEW: "Order Created",
      AWAITING_ALLOC: "Order Awaiting Allocation",
      DISPATCHED: "Order Dispatched",
      PICKED_UP: "Order Picked Up",
      DELIVERING: "Order Delivering",
      DELIVERED: "Order Delivered",
      RETURNED: "Order Returned",
      CANCELED: "Order Canceled",
      ON_HOLD: "Order On Hold"
    };
    const statusMessages: Record<string, string> = {
      NEW: `Order #${order.trackingNumber} has been created and is now active.`,
      AWAITING_ALLOC: `Order #${order.trackingNumber} is awaiting allocation to a warehouse or logistics provider.`,
      DISPATCHED: `Order #${order.trackingNumber} has been dispatched for delivery.`,
      PICKED_UP: `Order #${order.trackingNumber} has been picked up by logistics.`,
      DELIVERING: `Order #${order.trackingNumber} is currently out for delivery.`,
      DELIVERED: `Order #${order.trackingNumber} has been delivered to the customer.`,
      RETURNED: `Order #${order.trackingNumber} has been returned to the warehouse.`,
      CANCELED: `Order #${order.trackingNumber} has been canceled.`,
      ON_HOLD: `Order #${order.trackingNumber} is currently on hold.`
    };
    const notifTitle = statusTitles[order.status] || `Order Status Updated`;
    const notifMessage = statusMessages[order.status] || `Order #${order.trackingNumber} status updated to ${order.status}.`;
    const notifType = order.status === "DELIVERED" ? "SUCCESS" : order.status === "CANCELED" ? "ERROR" : "INFO";

    const merchantUsers = await prisma.user.findMany({
      where: {
        businessId: order.merchantId,
        role: { in: ["MERCHANT", "MERCHANT_STAFF"] },
      },
    });
    await Promise.all(
      merchantUsers.map((user) =>
        prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            title: notifTitle,
            message: notifMessage,
            type: notifType,
            audienceType: "MERCHANT",
            isRead: false,
            sendEmail: false,
            createdById: session.userId,
            linkUrl: `/merchant/orders/${order.id}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      order,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
