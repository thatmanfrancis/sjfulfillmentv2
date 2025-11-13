import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body; // action: "approve" or "reject"

    // Check if user is admin
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can approve/reject orders" },
        { status: 403 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can be approved/rejected" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "PROCESSING" : "CANCELLED";

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
      },
      include: {
        customer: true,
        items: true,
        currency: true,
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        newStatus,
        changedBy: auth.userId as string,
        notes: notes || (action === "approve" ? "Order approved by admin" : "Order rejected by admin"),
      },
    });

    // If approved, attempt to auto-assign a delivery attempt similar to order creation logic
    if (action === "approve") {
      try {
        // load shipping address and state
        const orderFull = await prisma.order.findUnique({ where: { id }, select: { shippingAddressId: true, merchantId: true } });
        const shippingAddress = orderFull?.shippingAddressId ? await prisma.address.findUnique({ where: { id: orderFull!.shippingAddressId } }) : null;
        const state = shippingAddress?.state?.trim();

        if (state) {
          let assignedUserId: string | null = null;
          await prisma.$transaction(async (tx) => {
            const merchantIdVal = orderFull!.merchantId;

            const queryCandidates = async (merchantScoped: boolean) => {
              if (merchantScoped) {
                return await tx.$queryRaw`
                  SELECT lp.user_id as user_id, lp.capacity as capacity
                  FROM logistics_profiles lp
                  JOIN merchant_staff ms ON ms.user_id = lp.user_id
                  WHERE lp.active = true
                    AND ms.merchant_id = ${merchantIdVal}
                    AND lp."coverageStates" @> ${JSON.stringify([state])}::jsonb
                `;
              }

              return await tx.$queryRaw`
                SELECT lp.user_id as user_id, lp.capacity as capacity
                FROM logistics_profiles lp
                WHERE lp.active = true
                  AND lp."coverageStates" @> ${JSON.stringify([state])}::jsonb
              `;
            };

            let rawCandidates: Array<{ user_id: string; capacity: number }> = await queryCandidates(true) as any;
            if (!rawCandidates || rawCandidates.length === 0) {
              rawCandidates = await queryCandidates(false) as any;
            }

            for (const c of rawCandidates) {
              const candidateId = (c as any).user_id;
              const capacity = (c as any).capacity || 4;

              await tx.$executeRaw`SELECT 1 FROM logistics_profiles WHERE user_id = ${candidateId} FOR UPDATE`;

              const activeCount = await tx.deliveryAttempt.count({
                where: {
                  handlerId: candidateId,
                  NOT: { status: "DELIVERED" },
                },
              });

                if (activeCount < capacity) {
                  await tx.deliveryAttempt.create({
                    data: {
                      orderId: id,
                      attemptNumber: 1,
                      status: "ASSIGNED",
                      comments: "Assigned on admin approval",
                      handlerId: candidateId,
                    },
                  });

                  await tx.order.update({ where: { id }, data: { assignedTo: candidateId } });
                  assignedUserId = candidateId;
                  break;
                }
            }
            });

          // Notify stakeholders if an assignment occurred
          if (assignedUserId) {
            try {
              const refreshedOrder = await prisma.order.findUnique({ where: { id }, select: { assignedTo: true, merchantId: true, orderNumber: true } });

              // Notify assigned logistics user
              await sendNotification({
                userId: assignedUserId,
                merchantId: refreshedOrder?.merchantId,
                type: "SHIPMENT_UPDATE",
                title: "Delivery assigned",
                message: `A delivery for order ${refreshedOrder?.orderNumber} has been assigned to you.`,
                actionUrl: `/orders/${id}`,
              });

              // Notify merchant owner
              if (refreshedOrder?.merchantId) {
                const merchant = await prisma.merchant.findUnique({ where: { id: refreshedOrder.merchantId }, select: { ownerUserId: true } });
                if (merchant?.ownerUserId) {
                  await sendNotification({
                    userId: merchant.ownerUserId,
                    merchantId: refreshedOrder.merchantId,
                    type: "SHIPMENT_UPDATE",
                    title: "Delivery assigned",
                    message: `Delivery for order ${refreshedOrder.orderNumber} was assigned to a logistics personnel.`,
                    actionUrl: `/orders/${id}`,
                  });
                }
              }

              // Notify admins
              const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
              if (admins.length > 0) {
                await Promise.all(admins.map((a) => sendNotification({
                  userId: a.id,
                  merchantId: refreshedOrder?.merchantId,
                  type: "SHIPMENT_UPDATE",
                  title: "Delivery assigned",
                  message: `Order ${refreshedOrder?.orderNumber} was assigned to a logistics personnel.`,
                  actionUrl: `/orders/${id}`,
                })));
              }
            } catch (notifErr) {
              console.error("Failed to send assignment notifications after approval:", notifErr);
            }
          }
        }
      } catch (assignError) {
        console.error("Auto-assign after approve error:", assignError);
      }
    }

    // Notify merchant and admins about the order approval/rejection
    try {
      const merchantInfo = await prisma.merchant.findUnique({ where: { id: updatedOrder.merchantId }, select: { ownerUserId: true } });
      const orderNumber = updatedOrder.orderNumber;

      // Notify merchant owner
      if (merchantInfo?.ownerUserId) {
        await sendNotification({
          userId: merchantInfo.ownerUserId,
          merchantId: updatedOrder.merchantId,
          type: "ORDER_STATUS",
          title: `Order ${action}d`,
          message: `Order ${orderNumber} was ${action}d by an admin.`,
          actionUrl: `/orders/${id}`,
        });
      }

      // Notify admins
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      if (admins.length > 0) {
        await Promise.all(admins.map((a) => sendNotification({
          userId: a.id,
          merchantId: updatedOrder.merchantId,
          type: "ORDER_STATUS",
          title: `Order ${action}d`,
          message: `Order ${orderNumber} was ${action}d by an admin.`,
          actionUrl: `/orders/${id}`,
        })));
      }
    } catch (notifErr) {
      console.error("Failed to send order status notifications:", notifErr);
    }

    return NextResponse.json({
      message: `Order ${action}d successfully`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Approve/reject order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process order action" },
      { status: 500 }
    );
  }
}
