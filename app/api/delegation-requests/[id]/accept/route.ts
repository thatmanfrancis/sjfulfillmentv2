import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Authentication required` }, { status: 401 });
  }

  try {
    const { id } = await params;
    const requestRow = await prisma.delegationRequest.findUnique({ where: { id } });
    if (!requestRow) {
      return NextResponse.json({ error: "Delegation request not found" }, { status: 404 });
    }

    if (requestRow.toUserId !== String(auth.userId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (requestRow.status !== "PENDING") {
      return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
    }

    // Attempt to accept within a transaction: ensure capacity still available
    await prisma.$transaction(async (tx) => {
      // Lock recipient's logistics profile
      await tx.$executeRaw`
        SELECT 1 FROM logistics_profiles WHERE user_id = ${requestRow.toUserId} FOR UPDATE
      `;

  const profile = await tx.logisticsProfile.findUnique({ where: { userId: requestRow.toUserId } as any });
  const capacity = profile?.capacity ?? 4;

      const activeCount = await tx.deliveryAttempt.count({
        where: { handlerId: requestRow.toUserId, NOT: { status: "DELIVERED" } },
      });

      if (activeCount >= capacity) {
        // mark request as declined due to capacity
        await tx.delegationRequest.update({ where: { id }, data: { status: "DECLINED", respondedAt: new Date() } });
        throw new Error("Target user capacity exceeded");
      }

      // transfer handler on deliveryAttempt and order
      await tx.deliveryAttempt.update({ where: { id: requestRow.deliveryAttemptId }, data: { handlerId: requestRow.toUserId } });
      // also update order.assignedTo
      const attempt = await tx.deliveryAttempt.findUnique({ where: { id: requestRow.deliveryAttemptId } });
      if (attempt) {
        await tx.order.update({ where: { id: attempt.orderId }, data: { assignedTo: requestRow.toUserId } });
      }

      await tx.delegationRequest.update({ where: { id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    });

    // Notify parties
    await prisma.notification.create({
      data: {
        userId: requestRow.fromUserId,
        type: "SYSTEM_ALERT",
        title: "Delegation accepted",
        message: `Your delegation request ${requestRow.id} was accepted`,
        data: { delegationRequestId: requestRow.id },
      },
    });

    return NextResponse.json({ message: "Delegation accepted" });
  } catch (error: any) {
    console.error("Accept delegation error:", error);
    return NextResponse.json({ error: error?.message || "Failed to accept delegation" }, { status: 500 });
  }
}
