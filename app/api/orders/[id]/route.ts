import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateOrderSchema = z.object({
  status: z.enum([
    "NEW",
    "AWAITING_ALLOC", 
    "DISPATCHED",
    "PICKED_UP",
    "DELIVERING", 
    "DELIVERED",
    "RETURNED",
    "CANCELED",
    "ON_HOLD"
  ]).optional(),
  assignedLogisticsId: z.string().uuid().optional().nullable(),
  fulfillmentWarehouseId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  customerPhone: z.string().optional(),
  externalOrderId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    // Build where clause based on user role
    let where: any = { id };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only see their own orders
      where.businessId = authResult.user.businessId;
    } else if (authResult.user.role === "LOGISTICS") {
      // Logistics can see orders assigned to them
      // TODO: Add warehouse region filtering when logistics regions are configured
      where.OR = [
        { assignedLogisticsId: authResult.user.id },
      ];
    }

    const order = await prisma.order.findUnique({
      where,
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            contactPhone: true,
          }
        },
        Warehouse: {
          select: {
            id: true,
            name: true,
            region: true,
          }
        },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                sku: true,
                weightKg: true,
                dimensions: true,
              }
            }
          }
        },
        Shipment: {
          select: {
            id: true,
            trackingNumber: true,
            carrierName: true,
            labelUrl: true,
            deliveryAttempts: true,
            lastStatusUpdate: true,
          }
        }
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Calculate order metrics
    const totalQuantity = order.OrderItem?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const totalWeight = order.OrderItem?.reduce((sum: number, item: any) => sum + (item.Product.weightKg || 0) * item.quantity, 0) || 0;

    // Get order history/audit trail
    const orderHistory = await prisma.auditLog.findMany({
      where: {
        entityType: "Order",
        entityId: id,
      },
      orderBy: { timestamp: "desc" },
      take: 20,
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      }
    });

    return NextResponse.json({
      order: {
        ...order,
        summary: {
          totalItems: order.OrderItem?.length || 0,
          totalQuantity,
          totalWeight,
          estimatedValue: order.totalAmount,
        }
      },
      timeline: orderHistory,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    // Check if order exists and user has permission
    let where: any = { id };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only update their own orders and only limited fields
      where.businessId = authResult.user.businessId;
      
      // Merchants can only update customer info
      const allowedFields = ["customerName", "customerAddress", "customerPhone", "externalOrderId"];
      const hasDisallowedFields = Object.keys(validatedData).some(key => !allowedFields.includes(key));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: "Insufficient permissions to update these fields" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role === "LOGISTICS") {
      // Logistics can update orders assigned to them
      // TODO: Add warehouse region filtering when logistics regions are configured
      where.OR = [
        { assignedLogisticsId: authResult.user.id },
      ];
      
      // Logistics can update status and assignments
      const allowedFields = ["status", "assignedLogisticsId", "fulfillmentWarehouseId"];
      const hasDisallowedFields = Object.keys(validatedData).some(key => !allowedFields.includes(key));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: "Insufficient permissions to update these fields" },
          { status: 403 }
        );
      }
    }
    // ADMIN can update everything

    const existingOrder = await prisma.order.findUnique({
      where,
      include: {
        Business: {
          select: { name: true }
        }
      }
    });    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate business rules
    if (validatedData.assignedLogisticsId) {
      const logistics = await prisma.user.findUnique({
        where: { id: validatedData.assignedLogisticsId },
        select: { id: true, role: true }
      });

      if (!logistics || logistics.role !== "LOGISTICS") {
        return NextResponse.json(
          { error: "Invalid logistics user" },
          { status: 400 }
        );
      }
    }

    if (validatedData.fulfillmentWarehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: validatedData.fulfillmentWarehouseId }
      });

      if (!warehouse) {
        return NextResponse.json(
          { error: "Invalid or inactive warehouse" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    
    Object.keys(validatedData).forEach(key => {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        updateData[key] = validatedData[key as keyof typeof validatedData];
      }
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        Business: {
          select: {
            name: true,
            contactPhone: true,
          }
        },
        Warehouse: {
          select: {
            name: true,
          }
        },
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Order",
        entityId: id,
        action: "ORDER_UPDATED",
        details: {
          changes: validatedData,
          previousValues: {
            status: existingOrder.status,
            assignedLogisticsId: existingOrder.assignedLogisticsId,
            fulfillmentWarehouseId: existingOrder.fulfillmentWarehouseId,
          },
          externalOrderId: existingOrder.externalOrderId,
          businessName: existingOrder.Business?.name || 'Unknown',
        },
        changedById: authResult.user.id,
      } as any, // Use UncheckedCreateInput
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN can delete orders
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        Business: {
          select: { name: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order can be safely deleted
    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot delete delivered orders" },
        { status: 400 }
      );
    }

    // Delete related records first
    await prisma.$transaction(async (tx) => {
      // Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });

      // Delete shipments
      await tx.shipment.deleteMany({
        where: { orderId: id }
      });

      // Delete the order
      await tx.order.delete({
        where: { id }
      });
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Order",
        entityId: id,
        action: "ORDER_DELETED",
        details: {
          externalOrderId: order.externalOrderId,
          businessName: order.Business?.name || 'Unknown',
          status: order.status,
          customerName: order.customerName,
          deletedAt: new Date(),
        },
        changedById: authResult.user.id,
      } as any, // Use UncheckedCreateInput
    });

    return NextResponse.json({
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}