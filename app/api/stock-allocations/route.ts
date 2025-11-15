import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/notifications";

const createStockAllocationSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  allocatedQuantity: z.number().int().min(0),
  safetyStock: z.number().int().min(0).optional().default(0),
});

const updateStockAllocationSchema = z.object({
  allocatedQuantity: z.number().int().min(0).optional(),
  safetyStock: z.number().int().min(0).optional(),
});

const bulkUpdateSchema = z.object({
  allocations: z.array(z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    allocatedQuantity: z.number().int().min(0),
    safetyStock: z.number().int().min(0).optional().default(0),
  })),
});

// GET /api/stock-allocations - List stock allocations
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const businessId = searchParams.get("businessId");
    const lowStock = searchParams.get("lowStock") === "true";

    let where: any = {};

    // Filter by warehouse
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    // Filter by product
    if (productId) {
      where.productId = productId;
    }

    // Role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      where.product = {
        businessId: authResult.user.businessId,
      };
    } else if (businessId && authResult.user.role === "ADMIN") {
      where.product = {
        businessId,
      };
    }

    // For logistics users, only show allocations in their assigned warehouses
    if (authResult.user.role === "LOGISTICS") {
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: {
          warehouseId: true
        }
      });

      const warehouseIds = userRegions.map((ur) => ur.warehouseId);      where.warehouseId = {
        in: warehouseIds,
      };
    }

    const allocations = await prisma.stockAllocation.findMany({
      where,
      include: {
        product: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
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
      orderBy: [
        { warehouse: { name: "asc" } },
        { product: { name: "asc" } },
      ],
    });

    // Filter for low stock if requested
    let filteredAllocations = allocations;
    if (lowStock) {
      filteredAllocations = allocations.filter(
        allocation => allocation.allocatedQuantity <= allocation.safetyStock * 1.5
      );
    }

    return NextResponse.json({
      allocations: filteredAllocations.map(allocation => ({
        ...allocation,
        availableStock: Math.max(0, allocation.allocatedQuantity - allocation.safetyStock),
        isLowStock: allocation.allocatedQuantity <= allocation.safetyStock * 1.5,
      })),
    });
  } catch (error) {
    console.error("Error fetching stock allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/stock-allocations - Create new stock allocation (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can create stock allocations
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createStockAllocationSchema.parse(body);

    // Check if allocation already exists
    const existingAllocation = await prisma.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: validatedData.productId,
          warehouseId: validatedData.warehouseId,
        },
      },
    });

    if (existingAllocation) {
      return NextResponse.json(
        { error: "Stock allocation already exists for this product-warehouse combination" },
        { status: 400 }
      );
    }

    // Verify product and warehouse exist
    const [product, warehouse] = await Promise.all([
      prisma.product.findUnique({
        where: { id: validatedData.productId },
        include: {
          business: { select: { name: true } },
        },
      }),
      prisma.warehouse.findUnique({
        where: { id: validatedData.warehouseId },
      }),
    ]);

    if (!product || !warehouse) {
      return NextResponse.json(
        { error: "Product or warehouse not found" },
        { status: 404 }
      );
    }

    const allocation = await prisma.stockAllocation.create({
      data: validatedData,
      include: {
        product: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
              },
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
    await createAuditLog(
      authResult.user.id,
      "StockAllocation",
      allocation.id,
      "STOCK_ALLOCATION_CREATED",
      {
        productName: product.name,
        warehouseName: warehouse.name,
        allocatedQuantity: allocation.allocatedQuantity,
        safetyStock: allocation.safetyStock,
      }
    );

    return NextResponse.json({
      ...allocation,
      availableStock: Math.max(0, allocation.allocatedQuantity - allocation.safetyStock),
      isLowStock: allocation.allocatedQuantity <= allocation.safetyStock * 1.5,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating stock allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/stock-allocations - Bulk update stock allocations (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can bulk update stock allocations
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = bulkUpdateSchema.parse(body);

    const results = [];
    const errors = [];

    // Process each allocation update
    for (const allocation of validatedData.allocations) {
      try {
        const updated = await prisma.stockAllocation.upsert({
          where: {
            productId_warehouseId: {
              productId: allocation.productId,
              warehouseId: allocation.warehouseId,
            },
          },
          update: {
            allocatedQuantity: allocation.allocatedQuantity,
            safetyStock: allocation.safetyStock,
          },
          create: {
            productId: allocation.productId,
            warehouseId: allocation.warehouseId,
            allocatedQuantity: allocation.allocatedQuantity,
            safetyStock: allocation.safetyStock,
          },
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
            warehouse: {
              select: {
                name: true,
                region: true,
              },
            },
          },
        });

        results.push(updated);

        // Create audit log for each update
        await createAuditLog(
          authResult.user.id,
          "StockAllocation",
          updated.id,
          "STOCK_ALLOCATION_BULK_UPDATED",
          {
            productSku: updated.product.sku,
            warehouseName: updated.warehouse.name,
            allocatedQuantity: updated.allocatedQuantity,
            safetyStock: updated.safetyStock,
          }
        );
      } catch (error) {
        errors.push({
          productId: allocation.productId,
          warehouseId: allocation.warehouseId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: results.length,
      errorCount: errors.length,
      results: results.map(allocation => ({
        ...allocation,
        availableStock: Math.max(0, allocation.allocatedQuantity - allocation.safetyStock),
        isLowStock: allocation.allocatedQuantity <= allocation.safetyStock * 1.5,
      })),
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error bulk updating stock allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}