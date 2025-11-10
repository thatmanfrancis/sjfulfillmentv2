import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while rejecting return` }, { status: 400 });
  }

  try {
    // Check if user is admin
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can reject returns" },
        { status: 403 }
      );
    }

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
