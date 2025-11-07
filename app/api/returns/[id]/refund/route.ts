import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while processing refunds` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { refundAmount, notes } = body;

    if (!refundAmount) {
      return NextResponse.json(
        { error: "Refund amount is required" },
        { status: 400 }
      );
    }

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmount,
        processedBy: auth.userId as string,
      },
      include: {
        order: true,
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: returnRecord.orderId },
      data: {
        paymentStatus: "REFUNDED",
      },
    });

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: returnRecord.order.customerId,
      merchantId: returnRecord.order.merchantId,
      type: "PAYMENT_RECEIVED",
      title: "Refund Processed",
      message: `Your refund of ${refundAmount} for return ${returnRecord.returnNumber} has been processed`,
      actionUrl: `/returns/${returnRecord.id}`,
      data: { returnId: returnRecord.id, refundAmount },
    });

    return NextResponse.json({
      message: "Refund processed successfully",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Process refund error:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
