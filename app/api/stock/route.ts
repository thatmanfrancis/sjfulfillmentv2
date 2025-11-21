import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Validation schemas
const stockAllocationUpdateSchema = z.object({
  allocatedQuantity: z.number().int().min(0).optional(),
  safetyStock: z.number().int().min(0).optional(),
});

const stockAllocationCreateSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  allocatedQuantity: z.number().int().min(0).default(0),
  safetyStock: z.number().int().min(0).default(0),
});

const bulkStockUpdateSchema = z.object({
  allocations: z.array(z.object({
    id: z.string().uuid().optional(),
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    allocatedQuantity: z.number().int().min(0),
    safetyStock: z.number().int().min(0),
  })).min(1).max(1000), // Limit bulk operations
  mode: z.enum(["update", "upsert"]).default("upsert"),
});

// Helper function to check warehouse access for logistics users - disabled
async function hasWarehouseAccess(userId: string, warehouseId: string) {
  // Logistics region access check disabled for now
  // TODO: Re-implement when logistics regions are properly configured
  return true; // Allow all access for now
}

// Helper function to get available stock (allocated - safety)
function getAvailableStock(allocation: any) {
  return Math.max(0, allocation.allocatedQuantity - allocation.safetyStock);
}

// GET /api/stock - List stock allocations with filtering
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const availableOnly = searchParams.get("availableOnly") === "true";
    const search = searchParams.get("search");
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const businessId = searchParams.get("businessId");
    const lowStock = searchParams.get("lowStock") === "true";

    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const offset = (page - 1) * limit;

    // Build filters based on user role
    let whereClause: any = {};
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      whereClause.Product = {
        businessId: authResult.user.businessId,
      };
    } else if (authResult.user.role === "LOGISTICS") {
      whereClause.warehouseId = { in: [] }; // No restrictions for now
    }

    // Apply additional filters
    if (warehouseId) {
      if (authResult.user.role === "LOGISTICS") {
        const hasAccess = await hasWarehouseAccess(authResult.user.id, warehouseId);
        if (!hasAccess) {
          return NextResponse.json(
            { error: "Access denied to this warehouse" },
            { status: 403 }
          );
        }
      }
      whereClause.warehouseId = warehouseId;
    }

    if (productId) {
      whereClause.productId = productId;
    }

    if (businessId && authResult.user.role === "ADMIN") {
      whereClause.Product = {
        ...whereClause.Product,
        businessId: businessId,
      };
    }

    if (search) {
      whereClause.OR = [
        {
          Product: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          Product: {
            sku: { contains: search, mode: "insensitive" },
          },
        },
        {
          Warehouse: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Get stock allocations with related data
    const [allocations, totalCount] = await Promise.all([
      prisma.stockAllocation.findMany({
        where: whereClause,
        include: {
          Product: {
            select: {
              id: true,
              name: true,
              sku: true,
              Business: {
                select: { id: true, name: true },
              },
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
        orderBy: [
          { Warehouse: { name: "asc" } },
          { Product: { name: "asc" } },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.stockAllocation.count({ where: whereClause }),
    ]);

    // Calculate available stock and apply filters
    let filteredAllocations = allocations.map(allocation => ({
      ...allocation,
      availableStock: getAvailableStock(allocation),
      isLowStock: getAvailableStock(allocation) <= allocation.safetyStock,
    }));

    if (lowStock) {
      filteredAllocations = filteredAllocations.filter(a => a.isLowStock);
    }

    if (availableOnly) {
      filteredAllocations = filteredAllocations.filter(a => a.availableStock > 0);
    }

    return NextResponse.json({
      allocations: filteredAllocations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalAllocations: filteredAllocations.length,
        totalStock: filteredAllocations.reduce((sum, a) => sum + a.allocatedQuantity, 0),
        totalAvailable: filteredAllocations.reduce((sum, a) => sum + a.availableStock, 0),
        totalSafetyStock: filteredAllocations.reduce((sum, a) => sum + a.safetyStock, 0),
        lowStockCount: filteredAllocations.filter(a => a.isLowStock).length,
      },
    });
  } catch (error) {
    console.error("Error fetching stock allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/stock - Create new stock allocation
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can create stock allocations
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create stock allocations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = stockAllocationCreateSchema.parse(body);

    // Verify product and warehouse exist
    const [product, warehouse] = await Promise.all([
      prisma.product.findUnique({
        where: { id: validatedData.productId },
        include: { Business: { select: { id: true, name: true } } },
      }),
      prisma.warehouse.findUnique({
        where: { id: validatedData.warehouseId },
        select: { id: true, name: true, region: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

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
        { error: "Stock allocation already exists for this product and warehouse" },
        { status: 409 }
      );
    }

    // Create the stock allocation
    const allocation = await prisma.stockAllocation.create({
      data: {
        id: crypto.randomUUID(),
        productId: validatedData.productId,
        warehouseId: validatedData.warehouseId,
        allocatedQuantity: validatedData.allocatedQuantity,
        safetyStock: validatedData.safetyStock,
      },
      include: {
        Product: {
          select: {
            id: true,
            name: true,
            sku: true,
            Business: { select: { id: true, name: true } },
          },
        },
        Warehouse: {
          select: { id: true, name: true, region: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "StockAllocation",
        entityId: allocation.id,
        action: "CREATE",
        details: {
          productId: validatedData.productId,
          warehouseId: validatedData.warehouseId,
          allocatedQuantity: validatedData.allocatedQuantity,
          safetyStock: validatedData.safetyStock,
        },
        changedById: authResult.user.id,
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json({
      ...allocation,
      availableStock: getAvailableStock(allocation),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
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

// PUT /api/stock - Bulk update stock allocations
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can bulk update stock
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can bulk update stock allocations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = bulkStockUpdateSchema.parse(body);

    const results = {
      updated: [] as any[],
      created: [] as any[],
      errors: [] as any[],
    };

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < validatedData.allocations.length; i += batchSize) {
      const batch = validatedData.allocations.slice(i, i + batchSize);

      for (const allocation of batch) {
        try {
          if (validatedData.mode === "upsert" || !allocation.id) {
            // Upsert mode - create or update
            const result = await prisma.stockAllocation.upsert({
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
                id: crypto.randomUUID(),
                productId: allocation.productId,
                warehouseId: allocation.warehouseId,
                allocatedQuantity: allocation.allocatedQuantity,
                safetyStock: allocation.safetyStock,
              },
              include: {
                Product: { select: { name: true, sku: true } },
                Warehouse: { select: { name: true } },
              },
            });

            const isNew = !allocation.id;
            if (isNew) {
              results.created.push(result);
            } else {
              results.updated.push(result);
            }
          } else {
            // Update mode - update existing only
            const result = await prisma.stockAllocation.update({
              where: { id: allocation.id },
              data: {
                allocatedQuantity: allocation.allocatedQuantity,
                safetyStock: allocation.safetyStock,
              },
              include: {
                Product: { select: { name: true, sku: true } },
                Warehouse: { select: { name: true } },
              },
            });
            results.updated.push(result);
          }
        } catch (error) {
          results.errors.push({
            allocation,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Create audit log for bulk operation
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "StockAllocation",
        entityId: "BULK_OPERATION",
        action: "BULK_UPDATE",
        details: {
          mode: validatedData.mode,
          totalProcessed: validatedData.allocations.length,
          updated: results.updated.length,
          created: results.created.length,
          errors: results.errors.length,
        },
        changedById: authResult.user.id,
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json({
      message: "Bulk stock allocation update completed",
      summary: {
        totalProcessed: validatedData.allocations.length,
        updated: results.updated.length,
        created: results.created.length,
        errors: results.errors.length,
      },
      results,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error in bulk stock update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}