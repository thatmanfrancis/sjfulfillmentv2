import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const stockAllocationUpdateSchema = z.object({
  allocatedQuantity: z.number().int().min(0).optional(),
  safetyStock: z.number().int().min(0).optional(),
});

// Helper function to check warehouse access for logistics users
async function hasWarehouseAccess(userId: string, warehouseId: string) {
  const region = await prisma.logisticsRegion.findFirst({
    where: { 
      userId: userId,
      warehouseId: warehouseId
    },
  });
  return !!region;
}

// Helper function to get available stock (allocated - safety)
function getAvailableStock(allocation: any) {
  return Math.max(0, allocation.allocatedQuantity - allocation.safetyStock);
}

// GET /api/stock/[id] - Get specific stock allocation with analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const allocationId = resolvedParams.id;

    // Get the stock allocation with related data
    const allocation = await prisma.stockAllocation.findUnique({
      where: { id: allocationId },
      include: {
        product: {
          include: {
            business: {
              select: { id: true, name: true },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    if (!allocation) {
      return NextResponse.json(
        { error: "Stock allocation not found" },
        { status: 404 }
      );
    }

    // Role-based access control
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      if (allocation.product.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role === "LOGISTICS") {
      const hasAccess = await hasWarehouseAccess(authResult.user.id, allocation.warehouseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to this warehouse" },
          { status: 403 }
        );
      }
    }

    // Get recent stock movements (orders) for this product/warehouse
    const recentOrders = await prisma.orderItem.findMany({
      where: {
        productId: allocation.productId,
        order: {
          fulfillmentWarehouseId: allocation.warehouseId,
          status: {
            in: ['DISPATCHED', 'PICKED_UP', 'DELIVERING', 'DELIVERED']
          },
          orderDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            externalOrderId: true,
            status: true,
            orderDate: true,
            customerName: true,
          },
        },
      },
      orderBy: { order: { orderDate: 'desc' } },
      take: 10,
    });

    // Calculate movement statistics
    const last30DaysOrders = await prisma.orderItem.findMany({
      where: {
        productId: allocation.productId,
        order: {
          fulfillmentWarehouseId: allocation.warehouseId,
          orderDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        order: {
          select: { status: true, orderDate: true },
        },
      },
    });

    const totalMovement = last30DaysOrders.reduce((sum, item) => sum + item.quantity, 0);
    const averageDailyMovement = totalMovement / 30;
    const estimatedDaysUntilStockOut = averageDailyMovement > 0 
      ? Math.floor(getAvailableStock(allocation) / averageDailyMovement)
      : null;

    // Get other warehouses with this product for transfer suggestions
    const otherAllocations = await prisma.stockAllocation.findMany({
      where: {
        productId: allocation.productId,
        warehouseId: { not: allocation.warehouseId },
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    const response = {
      ...allocation,
      availableStock: getAvailableStock(allocation),
      isLowStock: getAvailableStock(allocation) <= allocation.safetyStock,
      analytics: {
        last30Days: {
          totalMovement,
          averageDailyMovement: Math.round(averageDailyMovement * 100) / 100,
          ordersCount: last30DaysOrders.length,
          estimatedDaysUntilStockOut,
        },
        stockTurnover: allocation.allocatedQuantity > 0 
          ? Math.round((totalMovement / allocation.allocatedQuantity) * 100) / 100
          : 0,
      },
      recentOrders,
      otherWarehouses: otherAllocations.map(oa => ({
        warehouseId: oa.warehouseId,
        allocatedQuantity: oa.allocatedQuantity,
        safetyStock: oa.safetyStock,
        availableStock: getAvailableStock(oa),
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching stock allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/stock/[id] - Update stock allocation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const allocationId = resolvedParams.id;

    const body = await request.json();
    const validatedData = stockAllocationUpdateSchema.parse(body);

    // Get the existing allocation
    const existingAllocation = await prisma.stockAllocation.findUnique({
      where: { id: allocationId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            businessId: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingAllocation) {
      return NextResponse.json(
        { error: "Stock allocation not found" },
        { status: 404 }
      );
    }

    // Role-based permissions
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only update their own products' stock
      if (existingAllocation.product.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role === "LOGISTICS") {
      // Logistics users can only update stock in warehouses they're assigned to
      const hasAccess = await hasWarehouseAccess(authResult.user.id, existingAllocation.warehouseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to this warehouse" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Validate safety stock doesn't exceed allocated quantity
    const newAllocatedQuantity = validatedData.allocatedQuantity ?? existingAllocation.allocatedQuantity;
    const newSafetyStock = validatedData.safetyStock ?? existingAllocation.safetyStock;

    if (newSafetyStock > newAllocatedQuantity) {
      return NextResponse.json(
        { error: "Safety stock cannot exceed allocated quantity" },
        { status: 400 }
      );
    }

    // Update the stock allocation
    const updatedAllocation = await prisma.stockAllocation.update({
      where: { id: allocationId },
      data: validatedData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            business: {
              select: { id: true, name: true },
            },
          },
        },
        warehouse: {
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
        entityType: "StockAllocation",
        entityId: allocationId,
        action: "UPDATE",
        details: {
          previousValues: {
            allocatedQuantity: existingAllocation.allocatedQuantity,
            safetyStock: existingAllocation.safetyStock,
          },
          newValues: validatedData,
          product: existingAllocation.product,
          warehouse: existingAllocation.warehouse,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      ...updatedAllocation,
      availableStock: getAvailableStock(updatedAllocation),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating stock allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/stock/[id] - Delete stock allocation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can delete stock allocations
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete stock allocations" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const allocationId = resolvedParams.id;

    // Get the existing allocation for audit purposes
    const existingAllocation = await prisma.stockAllocation.findUnique({
      where: { id: allocationId },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingAllocation) {
      return NextResponse.json(
        { error: "Stock allocation not found" },
        { status: 404 }
      );
    }

    // Check if there are pending orders that depend on this stock
    const pendingOrders = await prisma.orderItem.findMany({
      where: {
        productId: existingAllocation.productId,
        order: {
          fulfillmentWarehouseId: existingAllocation.warehouseId,
          status: {
            in: ['NEW', 'AWAITING_ALLOC', 'DISPATCHED']
          }
        },
      },
      include: {
        order: {
          select: { id: true, externalOrderId: true, status: true },
        },
      },
    });

    if (pendingOrders.length > 0) {
      return NextResponse.json({
        error: "Cannot delete stock allocation with pending orders",
        pendingOrders: pendingOrders.map(po => ({
          orderId: po.order.id,
          externalOrderId: po.order.externalOrderId,
          status: po.order.status,
          quantity: po.quantity,
        })),
      }, { status: 409 });
    }

    // Delete the stock allocation
    await prisma.stockAllocation.delete({
      where: { id: allocationId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "StockAllocation",
        entityId: allocationId,
        action: "DELETE",
        details: {
          deletedAllocation: existingAllocation,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      message: "Stock allocation deleted successfully",
      deletedAllocation: existingAllocation,
    });

  } catch (error) {
    console.error("Error deleting stock allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}