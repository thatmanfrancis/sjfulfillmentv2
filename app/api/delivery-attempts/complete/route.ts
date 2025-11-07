import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while attempting delivery` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { attemptId, success, comments } = body;

    const attempt = await prisma.deliveryAttempt.findUnique({
      where: { id: attemptId },
      include: { order: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Delivery attempt not found" },
        { status: 404 }
      );
    }

    // Update attempt
    await prisma.deliveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: success ? "delivered" : "rejected",
        comments,
      },
    });

    // If successful, update order status
    if (success) {
      await prisma.order.update({
        where: { id: attempt.orderId },
        data: { status: "DELIVERED" },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: attempt.orderId,
          oldStatus: attempt.order.status,
          newStatus: "DELIVERED",
          changedBy: auth.userId as string,
          notes: `Delivered on attempt #${attempt.attemptNumber}`,
        },
      });
    }

    return NextResponse.json({
      message: success
        ? "Delivery completed successfully"
        : "Delivery attempt marked as failed",
    });
  } catch (error) {
    console.error("Complete delivery attempt error:", error);
    return NextResponse.json(
      { error: "Failed to complete delivery attempt" },
      { status: 500 }
    );
  }
}
