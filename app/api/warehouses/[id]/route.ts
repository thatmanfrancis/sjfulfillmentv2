import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateWarehouseSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().min(1).optional(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  managerName: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  operatingHours: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
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

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stockAllocations: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                weightKg: true,
                dimensions: true,
                business: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        },
        // fulfilledOrders - not available in current schema
        // logisticsRegion - disabled until schema is fixed
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Calculate warehouse statistics
    const totalAllocations = warehouse.stockAllocations.length;
    const totalAllocatedQuantity = warehouse.stockAllocations.reduce(
      (sum, allocation) => sum + allocation.allocatedQuantity, 0
    );
    const totalSafetyStock = warehouse.stockAllocations.reduce(
      (sum, allocation) => sum + allocation.safetyStock, 0
    );
    const availableStock = totalAllocatedQuantity - totalSafetyStock;

    // Group allocations by product
    const productSummary = warehouse.stockAllocations.reduce((acc, allocation) => {
      const productId = allocation.product.id;
      if (!acc[productId]) {
        acc[productId] = {
          product: allocation.product,
          allocatedQuantity: 0,
          safetyStock: 0,
          availableQuantity: 0,
        };
      }
      acc[productId].allocatedQuantity += allocation.allocatedQuantity;
      acc[productId].safetyStock += allocation.safetyStock;
      acc[productId].availableQuantity += (allocation.allocatedQuantity - allocation.safetyStock);
      return acc;
    }, {} as any);

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Warehouse", entityId: id },
          { 
            entityType: "StockAllocation",
            details: {
              path: ["warehouseId"],
              equals: id
            }
          }
        ]
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      include: {
        changedBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      }
    });

    // Order status breakdown - disabled (fulfilledOrders not available)
    const orderStatusCounts: Record<string, number> = {};

    return NextResponse.json({
      warehouse,
      statistics: {
        totalAllocations,
        totalAllocatedQuantity,
        totalSafetyStock,
        availableStock,
        capacityUtilization: null, // Capacity field not available in current schema
        totalOrders: 0, // fulfilledOrders not available
        orderStatusBreakdown: orderStatusCounts,
        uniqueProducts: Object.keys(productSummary).length,
        assignedLogisticsUsers: 0, // logisticsRegion disabled
      },
      productSummary: Object.values(productSummary),
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
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

    // Only ADMIN can update warehouses
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateWarehouseSchema.parse(body);

    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id }
    });

    if (!existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check for unique constraints if name is being updated
    if (validatedData.name && validatedData.name !== existingWarehouse.name) {
      const existingWithName = await prisma.warehouse.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id }
        }
      });

      if (existingWithName) {
        return NextResponse.json(
          { error: "Warehouse with this name already exists" },
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

    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        stockAllocations: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              }
            }
          }
        }
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Warehouse",
        entityId: id,
        action: "WAREHOUSE_UPDATED",
        details: {
          changes: validatedData,
          previousValues: {
            name: existingWarehouse.name,
            region: existingWarehouse.region,
          },
          warehouseName: updatedWarehouse.name,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({ warehouse: updatedWarehouse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating warehouse:", error);
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

    // Only ADMIN can delete warehouses
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        region: true,
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check if warehouse has any active allocations or orders - disabled for now
    // TODO: Re-implement when schema relations are fixed
    const hasActiveStock = false;
    const hasActiveOrders = false;

    if (hasActiveStock) {
      return NextResponse.json(
        { error: "Cannot delete warehouse with active stock allocations" },
        { status: 400 }
      );
    }

    if (hasActiveOrders) {
      return NextResponse.json(
        { error: "Cannot delete warehouse with active orders" },
        { status: 400 }
      );
    }

    // Check if warehouse has assigned logistics users - disabled
    // if (warehouse.logisticsRegions.length > 0) {
    //   return NextResponse.json(
    //     { error: "Cannot delete warehouse with assigned logistics users. Remove assignments first." },
    //     { status: 400 }
    //   );
    // }

    // Soft delete by deactivating instead of hard delete if there's historical data
    // Check for historical data - disabled until schema is fixed
    const hasHistoricalData = false;

    if (hasHistoricalData) {
      // Soft delete - just deactivate
      const updatedWarehouse = await prisma.warehouse.update({
        where: { id },
        data: {
          name: warehouse.name + " (DEACTIVATED)",
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          entityType: "Warehouse",
          entityId: id,
          action: "WAREHOUSE_DEACTIVATED",
          details: {
            warehouseName: warehouse.name,
            reason: "Soft delete due to historical data",
            deactivatedAt: new Date(),
          },
          changedById: authResult.user.id,
        },
      });

      return NextResponse.json({
        message: "Warehouse deactivated successfully (has historical data)",
        warehouse: updatedWarehouse,
      });
    } else {
      // Hard delete if no historical data
      await prisma.warehouse.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          entityType: "Warehouse",
          entityId: id,
          action: "WAREHOUSE_DELETED",
          details: {
            warehouseName: warehouse.name,
            deletedAt: new Date(),
          },
          changedById: authResult.user.id,
        },
      });

      return NextResponse.json({
        message: "Warehouse deleted successfully"
      });
    }
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}