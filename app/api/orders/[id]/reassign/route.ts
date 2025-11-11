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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
    }

    const { isAdmin } = await getUserMerchantContext(auth.userId as string);
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can reassign shipments" }, { status: 403 });
    }

    // Load order and its shipping state
    const order = await prisma.order.findUnique({ where: { id }, include: { shippingAddress: true, attempts: true } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const state = order.shippingAddress?.state?.trim();
    if (!state) return NextResponse.json({ error: "Shipping state unknown" }, { status: 400 });

    // Validate target has logistics profile covering state
    const targetProfile = await prisma.logisticsProfile.findUnique({ where: { userId: targetUserId } });
    if (!targetProfile || !targetProfile.active) return NextResponse.json({ error: "Target logistics profile not found or inactive" }, { status: 400 });

    const covers = (targetProfile.coverageStates as any) || [];
    if (!Array.isArray(covers) || !covers.includes(state)) {
      return NextResponse.json({ error: "Target does not cover this state" }, { status: 400 });
    }

    // Check capacity and reassign within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // lock target profile
      await tx.$executeRaw`SELECT 1 FROM logistics_profiles WHERE user_id = ${targetUserId} FOR UPDATE`;

      const activeCount = await tx.deliveryAttempt.count({ where: { handlerId: targetUserId, NOT: { status: "DELIVERED" } } });
      const capacity = targetProfile.capacity || 4;
      if (activeCount >= capacity) {
        throw new Error("Target has reached capacity");
      }

      // Update delivery attempts (assign the latest attempt which is not DELIVERED)
      const attempt = await tx.deliveryAttempt.findFirst({ where: { orderId: id, NOT: { status: "DELIVERED" } }, orderBy: { attemptedAt: "desc" } });
      if (!attempt) throw new Error("No active delivery attempt to reassign");

      await tx.deliveryAttempt.update({ where: { id: attempt.id }, data: { handlerId: targetUserId } });
      await tx.order.update({ where: { id }, data: { assignedTo: targetUserId } });

      // create an audit log / status history
      await tx.orderStatusHistory.create({ data: { orderId: id, oldStatus: order.status, newStatus: order.status, changedBy: auth.userId as string, notes: `Reassigned to ${targetUserId}` } });

      return { success: true };
    });

    return NextResponse.json({ message: "Reassigned successfully", result });
  } catch (error: any) {
    console.error("Reassign error:", error);
    return NextResponse.json({ error: error?.message || "Failed to reassign" }, { status: 500 });
  }
}
