import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while rejecting return` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status: "REJECTED",
        customerNotes: reason,
        processedBy: auth.userId as string,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Send notification
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId: returnRecord.order.customerId,
      merchantId: returnRecord.order.merchantId,
      type: "ORDER_STATUS",
      title: "Return Rejected",
      message: `Your return request ${returnRecord.returnNumber} has been rejected`,
      actionUrl: `/returns/${returnRecord.id}`,
      data: { returnId: returnRecord.id, reason },
    });

    return NextResponse.json({
      message: "Return rejected successfully",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Reject return error:", error);
    return NextResponse.json(
      { error: "Failed to reject return" },
      { status: 500 }
    );
  }
}
