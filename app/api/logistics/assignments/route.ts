import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const assignOrderSchema = z.object({
  orderId: z.string().uuid(),
  logisticsUserId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logisticsUserId = searchParams.get("logisticsUserId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    let where: any = {};

    // Role-based filtering
    if (authResult.user.role === "ADMIN") {
      if (logisticsUserId) where.assignedLogisticsId = logisticsUserId;
    } else if (authResult.user.role === "LOGISTICS") {
      where.assignedLogisticsId = authResult.user.id;
    }

    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: "desc" },
        include: {
          Business: {
            select: {
              id: true,
              name: true,
              baseCurrency: true,
            },
          },
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Warehouse: {
            select: {
              id: true,
              name: true,
              region: true,
            },
          },
          OrderItem: {
            select: {
              quantity: true,
              Product: {
                select: {
                  name: true,
                  weightKg: true,
                },
              },
            },
          },
          Shipment: {
            select: {
              id: true,
              trackingNumber: true,
              deliveryAttempts: true,
              lastStatusUpdate: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Get summary statistics
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: authResult.user.role === "LOGISTICS" ? { assignedLogisticsId: authResult.user.id } : {},
      _count: true,
    });

    return NextResponse.json({
      orders: orders.map(order => ({
        ...order,
        totalItems: Array.isArray(order.OrderItem) ? order.OrderItem.reduce((sum: number, item: any) => sum + item.quantity, 0) : 0,
        totalWeight: Array.isArray(order.OrderItem) ? order.OrderItem.reduce((sum: number, item: any) => sum + ((item.Product?.weightKg || 0) * item.quantity), 0) : 0,
        hasShipment: !!order.Shipment,
        daysSinceOrder: Math.ceil((new Date().getTime() - order.orderDate.getTime()) / (1000 * 3600 * 24)),
        logisticsUserName: order.User ? `${order.User.firstName} ${order.User.lastName}` : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
        totalAssignedOrders: total,
      },
    });
  } catch (error) {
    console.error("Error fetching logistics assignments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = assignOrderSchema.parse(body);

    // Verify order exists and is available for assignment
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        Business: { select: { name: true } },
        Warehouse: { select: { id: true, region: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "AWAITING_ALLOC") {
      return NextResponse.json(
        { error: "Order is not available for assignment" },
        { status: 400 }
      );
    }

    // Verify logistics user exists and has role LOGISTICS
    const logisticsUser = await prisma.user.findUnique({
      where: { id: validatedData.logisticsUserId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        role: true,
      },
    });

    if (!logisticsUser) {
      return NextResponse.json(
        { error: "Logistics user not found" },
        { status: 404 }
      );
    }

    if (logisticsUser.role !== "LOGISTICS") {
      return NextResponse.json(
        { error: "User must have LOGISTICS role" },
        { status: 400 }
      );
    }

    // TODO: Re-enable region validation when logistics regions are properly configured

    // Assign the order
    const updatedOrder = await prisma.order.update({
      where: { id: validatedData.orderId },
      data: {
        assignedLogisticsId: validatedData.logisticsUserId,
        status: "ASSIGNED_TO_LOGISTICS",
      },
      include: {
        Business: { select: { id: true, name: true } },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Warehouse: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Order",
        entityId: updatedOrder.id,
        action: "ORDER_ASSIGNED_TO_LOGISTICS",
        details: {
          logisticsUserId: validatedData.logisticsUserId,
          logisticsUserName: `${logisticsUser.firstName} ${logisticsUser.lastName}`,
          businessName: updatedOrder.Business ? updatedOrder.Business.name : null,
          oldStatus: "AWAITING_ALLOC",
          newStatus: "DISPATCHED",
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      order: updatedOrder,
      message: "Order successfully assigned to logistics user",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error assigning order to logistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const action = searchParams.get("action"); // "pickup", "delivering", "delivered", "returned"

    if (!orderId || !action) {
      return NextResponse.json(
        { error: "orderId and action are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        User: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if logistics user is assigned to this order
    if (authResult.user.role === "LOGISTICS" && order.assignedLogisticsId !== authResult.user.id) {
      return NextResponse.json(
        { error: "You are not assigned to this order" },
        { status: 403 }
      );
    }

    // Map actions to status updates
    const statusMap: Record<string, string> = {
      "pickup": "PICKED_UP",
      "delivering": "DELIVERING",
      "delivered": "DELIVERED",
      "returned": "RETURNED",
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus as any },
      include: {
        Business: { select: { name: true } },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Order",
        entityId: orderId,
        action: `ORDER_STATUS_UPDATED`,
        details: {
          action,
          oldStatus: order.status,
          newStatus: newStatus,
          logisticsUserName: null, // Not available in this context
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      order: updatedOrder,
      message: `Order status updated to ${newStatus}`,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}