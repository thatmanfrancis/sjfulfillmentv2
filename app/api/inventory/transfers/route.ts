import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const transferSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transferSchema.parse(body);

    const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = validatedData;

    // Validate warehouses are different
    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses must be different" },
        { status: 400 }
      );
    }

    // Authorization check
    if (!["ADMIN", "LOGISTICS"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions for stock transfers" },
        { status: 403 }
      );
    }

    // For logistics users, verify warehouse access
    if (authResult.user.role === "LOGISTICS") {
      const accessibleWarehouses = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true }
      });
      const warehouseIds = accessibleWarehouses.map(lr => lr.warehouseId);
      
      if (!warehouseIds.includes(fromWarehouseId) || !warehouseIds.includes(toWarehouseId)) {
        return NextResponse.json(
          { error: "Access denied to specified warehouses" },
          { status: 403 }
        );
      }
    }

    // Fetch and validate entities
    const [product, fromWarehouse, toWarehouse, fromStock, toStock] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        include: { business: { select: { name: true } } }
      }),
      prisma.warehouse.findUnique({
        where: { id: fromWarehouseId },
      }),
      prisma.warehouse.findUnique({
        where: { id: toWarehouseId },
      }),
      prisma.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: fromWarehouseId
          }
        }
      }),
      prisma.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: toWarehouseId
          }
        }
      })
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!fromWarehouse) {
      return NextResponse.json({ error: "Source warehouse not found" }, { status: 404 });
    }

    if (!toWarehouse) {
      return NextResponse.json({ error: "Destination warehouse not found" }, { status: 404 });
    }

    if (!fromStock) {
      return NextResponse.json(
        { error: "Product not allocated at source warehouse" },
        { status: 400 }
      );
    }

    // Check if sufficient stock is available
    const availableStock = Math.max(0, fromStock.allocatedQuantity - fromStock.safetyStock);
    if (availableStock < quantity) {
      return NextResponse.json({
        error: "Insufficient available stock for transfer",
        available: availableStock,
        requested: quantity,
        allocated: fromStock.allocatedQuantity,
        safetyStock: fromStock.safetyStock
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.stockTransfer.create({
        data: {
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          notes,
          status: "PENDING",
          requestedBy: authResult.user.id,
        }
      });

      // Update source warehouse stock
      await tx.stockAllocation.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: fromWarehouseId
          }
        },
        data: {
          allocatedQuantity: {
            decrement: quantity
          }
        }
      });

      // Update or create destination warehouse stock
      if (toStock) {
        await tx.stockAllocation.update({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId: toWarehouseId
            }
          },
          data: {
            allocatedQuantity: {
              increment: quantity
            }
          }
        });
      } else {
        await tx.stockAllocation.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            allocatedQuantity: quantity,
            safetyStock: 0
          }
        });
      }

      return transfer;
    });

    // Get the complete transfer record with relations
    const completeTransfer = await prisma.stockTransfer.findUnique({
      where: { id: result.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            business: { select: { name: true } }
          }
        },
        fromWarehouse: {
          select: { id: true, name: true, region: true }
        },
        toWarehouse: {
          select: { id: true, name: true, region: true }
        },
        requestedByUser: {
          select: { firstName: true, lastName: true, role: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      transfer: completeTransfer,
      message: "Stock transfer initiated successfully"
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Error initiating stock transfer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause for filtering
    let whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (warehouseId) {
      whereClause.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId }
      ];
    }

    if (productId) {
      whereClause.productId = productId;
    }

    // Role-based filtering
    if (authResult.user.role === "LOGISTICS") {
      const accessibleWarehouses = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true }
      });
      const warehouseIds = accessibleWarehouses.map(lr => lr.warehouseId);
      
      whereClause.AND = [
        whereClause.AND || {},
        {
          OR: [
            { fromWarehouseId: { in: warehouseIds } },
            { toWarehouseId: { in: warehouseIds } }
          ]
        }
      ].filter(Boolean);
    }

    const [transfers, totalCount] = await Promise.all([
      prisma.stockTransfer.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              business: { select: { name: true } }
            }
          },
          fromWarehouse: {
            select: { id: true, name: true, region: true }
          },
          toWarehouse: {
            select: { id: true, name: true, region: true }
          },
          requestedByUser: {
            select: { firstName: true, lastName: true, role: true }
          },
          approvedByUser: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      }),
      prisma.stockTransfer.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      filters: {
        status,
        warehouseId,
        productId
      }
    });

  } catch (error) {
    console.error("Error fetching stock transfers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}