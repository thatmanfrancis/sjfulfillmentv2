import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const status = searchParams.get("status") || "PENDING";

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Build warehouse filter
    let warehouseFilter: any = {};
    if (!isAdmin) {
      warehouseFilter = {
        OR: [
          { merchantId: { in: merchantIds } },
          { staff: { some: { userId: auth.userId as string } } }
        ]
      };
    }

    if (warehouseId) {
      warehouseFilter.id = warehouseId;
    }

    // Get pending orders that need picking
    const orders = await prisma.order.findMany({
      where: {
        status: status === "PENDING" ? "CONFIRMED" : status as any,
        items: {
          some: {
            product: {
              inventory: {
                some: {
                  warehouse: warehouseFilter,
                  quantityAvailable: { gt: 0 }
                }
              }
            }
          }
        }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: {
                  include: { warehouse: true },
                  where: {
                    warehouse: warehouseFilter
                  }
                }
              }
            }
          }
        },
        customer: true,
        merchant: true,
        statusHistory: {
          take: 1,
          orderBy: { changedAt: "desc" }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    // Transform into picking tasks
    const pickingTasks = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      priority: order.priority || "NORMAL",
      status: order.status,
      customer: {
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        email: order.customer.email
      },
      merchant: {
        name: order.merchant.businessName
      },
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        pickedQuantity: item.pickedQuantity || 0,
        availableQuantity: item.product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
        warehouse: item.product.inventory[0]?.warehouse?.name,
        location: item.product.inventory[0]?.binLocation
      }))
    }));

    return NextResponse.json({
      tasks: pickingTasks,
      total: pickingTasks.length
    });
  } catch (error) {
    console.error("Error fetching picking tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch picking tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId, items, warehouseId } = await req.json();

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Verify order access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { merchant: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!isAdmin && !merchantIds.includes(order.merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Process picking
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING" }
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: order.status,
          newStatus: "PROCESSING",
          changedBy: auth.userId as string,
          notes: "Picking started"
        }
      });

        // Update order items with picked quantities
        for (const item of items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              pickedQuantity: item.pickedQuantity,
              pickedBy: auth.userId as string,
              pickedAt: new Date()
            }
          });

          // Update inventory
          await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              warehouseId
            },
            data: {
              quantityAvailable: { decrement: item.pickedQuantity }
            }
          });
        }
    });

    return NextResponse.json({
      message: "Items picked successfully",
      status: "PROCESSING"
    });
  } catch (error) {
    console.error("Error processing picking task:", error);
    return NextResponse.json(
      { error: "Failed to process picking task" },
      { status: 500 }
    );
  }
}