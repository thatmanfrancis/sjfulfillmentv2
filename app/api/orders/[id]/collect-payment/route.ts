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
      { message: `Error occured while collecting payment` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { amountCollected, paymentMethod, notes } = body;

    if (!amountCollected || amountCollected <= 0) {
      return NextResponse.json(
        { error: "Valid amount collected is required" },
        { status: 400 }
      );
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        merchant: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if already collected
    const existingCollection = await prisma.orderPaymentCollection.findFirst({
      where: { orderId: id },
    });

    if (existingCollection) {
      return NextResponse.json(
        { error: "Payment already collected for this order" },
        { status: 400 }
      );
    }

    // Create payment collection record
    const collection = await prisma.orderPaymentCollection.create({
      data: {
        orderId: id,
        amountCollected,
        collectedBy: auth.userId as string,
        paymentMethod: paymentMethod || "CASH",
        notes,
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: id },
      data: {
        paymentStatus: "PAID",
      },
    });

    // Update merchant balance
    const merchantBalance = await prisma.merchantBalance.upsert({
      where: { merchantId: order.merchantId },
      create: {
        merchantId: order.merchantId,
        totalCollected: amountCollected,
        pendingBalance: amountCollected,
      },
      update: {
        totalCollected: { increment: amountCollected },
        pendingBalance: { increment: amountCollected },
      },
    });

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: order.customerId,
      merchantId: order.merchantId,
      type: "PAYMENT_RECEIVED",
      title: "Payment Collected",
      message: `Payment of ${amountCollected} collected for order ${order.orderNumber}`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id, amountCollected },
    });

    return NextResponse.json({
      message: "Payment collected successfully",
      collection,
      merchantBalance,
    });
  } catch (error) {
    console.error("Collect payment error:", error);
    return NextResponse.json(
      { error: "Failed to collect payment" },
      { status: 500 }
    );
  }
}
