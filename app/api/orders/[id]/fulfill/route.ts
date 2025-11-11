import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, warehouseId, items } = await req.json();

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const userRole = (await getUserMerchantContext(auth.userId as string)).userRole;

    // Verify order access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: {
                  include: { warehouse: true },
                },
              },
            },
          },
        },
        merchant: true,
        customer: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!isAdmin && !merchantIds.includes(order.merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    switch (action) {
      case "pick": {
        // Only admins or warehouse/logistics personnel may pick
        if (!isAdmin && userRole !== "WAREHOUSE_MANAGER" && userRole !== "LOGISTICS_PERSONNEL") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update order status to PROCESSING and create picking tasks
        await prisma.$transaction(async (tx) => {
          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: { status: "PROCESSING" },
          });

          // Create status history
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: order.status,
              newStatus: "PROCESSING",
              changedBy: auth.userId as string,
              notes: "Order started picking process",
            },
          });

          // Update inventory with picked quantities
          for (const item of items) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                pickedQuantity: item.pickedQuantity,
                pickedBy: auth.userId as string,
                pickedAt: new Date(),
              },
            });

            // Update inventory
            await tx.inventory.updateMany({
              where: {
                productId: item.productId,
                warehouseId,
              },
              data: {
                quantityAvailable: { decrement: item.pickedQuantity },
              },
            });
          }
        });

        return NextResponse.json({
          message: "Items picked successfully",
          status: "PROCESSING",
        });
      }

      case "pack": {
        // Only admins or warehouse/logistics personnel may pack
        if (!isAdmin && userRole !== "WAREHOUSE_MANAGER" && userRole !== "LOGISTICS_PERSONNEL") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update order status to PACKED
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "PACKED" },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: order.status,
              newStatus: "PACKED",
              changedBy: auth.userId as string,
              notes: "Order packed and ready for shipment",
            },
          });

          // Mark items as packed
          for (const item of items) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                packedQuantity: item.packedQuantity,
                packedBy: auth.userId as string,
                packedAt: new Date(),
              },
            });
          }
        });

        return NextResponse.json({
          message: "Order packed successfully",
          status: "PACKED",
        });
      }

      case "ship": {
        // Only admins or warehouse/logistics personnel may ship
        if (!isAdmin && userRole !== "WAREHOUSE_MANAGER" && userRole !== "LOGISTICS_PERSONNEL") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { trackingNumber, shippingCarrier, shippingCost } =
          await req.json();

        // Create shipment and update order status
        await prisma.$transaction(async (tx) => {
          // Create shipment record
          const shipment = await tx.shipment.create({
            data: {
              orderId,
              trackingNumber,
              carrier: shippingCarrier,
              shippingCost,
              status: "IN_TRANSIT",
              createdBy: auth.userId as string,
            },
          });

          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: { 
              status: "SHIPPED",
              shippedAt: new Date(),
            },
          });          await tx.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: order.status,
              newStatus: "SHIPPED",
              changedBy: auth.userId as string,
              notes: `Order shipped with ${shippingCarrier}, tracking: ${trackingNumber}`,
            },
          });
        });

        return NextResponse.json({
          message: "Order shipped successfully",
          status: "SHIPPED",
        });
      }

      case "deliver": {
        // Only admins or warehouse/logistics personnel may mark delivery
        if (!isAdmin && userRole !== "WAREHOUSE_MANAGER" && userRole !== "LOGISTICS_PERSONNEL") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Mark order as delivered
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { 
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });          await tx.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: order.status,
              newStatus: "DELIVERED",
              changedBy: auth.userId as string,
              notes: "Order delivered successfully",
            },
          });

          // Update shipment status
          await tx.shipment.updateMany({
            where: { orderId },
            data: {
              status: "DELIVERED",
              actualDeliveryDate: new Date(),
            },
          });
        });

        return NextResponse.json({
          message: "Order delivered successfully",
          status: "DELIVERED",
        });
      }

      case "cancel": {
        const { reason } = await req.json();

        // Cancel order and restore inventory
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED" },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: order.status,
              newStatus: "CANCELLED",
              changedBy: auth.userId as string,
              notes: reason || "Order cancelled",
            },
          });

          // Restore inventory for picked items
          for (const item of order.items) {
            if (item.pickedQuantity && item.pickedQuantity > 0) {
              await tx.inventory.updateMany({
                where: {
                  productId: item.productId,
                  warehouseId,
                },
                data: {
                  quantityAvailable: { increment: item.pickedQuantity },
                },
              });
            }
          }
        });

        return NextResponse.json({
          message: "Order cancelled successfully",
          status: "CANCELLED",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Order fulfillment error:", error);
    return NextResponse.json(
      { error: "Failed to process order fulfillment" },
      { status: 500 }
    );
  }
}
