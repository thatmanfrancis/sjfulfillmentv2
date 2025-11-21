import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const stockTransferSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).optional(),
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

// POST /api/stock/transfer - Transfer stock between warehouses
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = stockTransferSchema.parse(body);

    // Validate transfer (can't transfer to same warehouse)
    if (validatedData.fromWarehouseId === validatedData.toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses cannot be the same" },
        { status: 400 }
      );
    }

    // Role-based permissions
    if (authResult.user.role === "LOGISTICS") {
      // Logistics users must have access to both warehouses
      const [hasFromAccess, hasToAccess] = await Promise.all([
        hasWarehouseAccess(authResult.user.id, validatedData.fromWarehouseId),
        hasWarehouseAccess(authResult.user.id, validatedData.toWarehouseId),
      ]);
      
      if (!hasFromAccess || !hasToAccess) {
        return NextResponse.json(
          { error: "Access denied to one or both warehouses" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only transfer their own products
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId },
        select: { businessId: true },
      });
      
      if (!product || product.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Product not found or access denied" },
          { status: 403 }
        );
      }
    } else if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get source and destination allocations
    const [sourceAllocation, destAllocation, product, fromWarehouse, toWarehouse] = await Promise.all([
      prisma.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId: validatedData.productId,
            warehouseId: validatedData.fromWarehouseId,
          },
        },
      }),
      prisma.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId: validatedData.productId,
            warehouseId: validatedData.toWarehouseId,
          },
        },
      }),
      prisma.product.findUnique({
        where: { id: validatedData.productId },
        select: { id: true, name: true, sku: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: validatedData.fromWarehouseId },
        select: { id: true, name: true, region: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: validatedData.toWarehouseId },
        select: { id: true, name: true, region: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (!fromWarehouse || !toWarehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    if (!sourceAllocation) {
      return NextResponse.json(
        { error: "No stock allocation found at source warehouse" },
        { status: 404 }
      );
    }

    // Check if source has enough available stock
    const availableStock = getAvailableStock(sourceAllocation);
    if (availableStock < validatedData.quantity) {
      return NextResponse.json(
        {
          error: "Insufficient available stock at source warehouse",
          available: availableStock,
          requested: validatedData.quantity,
          allocated: sourceAllocation.allocatedQuantity,
          safety: sourceAllocation.safetyStock,
        },
        { status: 400 }
      );
    }

    // Perform the transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Reduce stock at source warehouse
      const updatedSource = await tx.stockAllocation.update({
        where: {
          productId_warehouseId: {
            productId: validatedData.productId,
            warehouseId: validatedData.fromWarehouseId,
          },
        },
        data: {
          allocatedQuantity: sourceAllocation.allocatedQuantity - validatedData.quantity,
        },
      });

      // Increase stock at destination warehouse (create if doesn't exist)
      const updatedDest = await tx.stockAllocation.upsert({
        where: {
          productId_warehouseId: {
            productId: validatedData.productId,
            warehouseId: validatedData.toWarehouseId,
          },
        },
        update: {
          allocatedQuantity: (destAllocation?.allocatedQuantity || 0) + validatedData.quantity,
        },
        create: {
              id: crypto.randomUUID(),
          productId: validatedData.productId,
          warehouseId: validatedData.toWarehouseId,
          allocatedQuantity: validatedData.quantity,
          safetyStock: 0,
        },
      });

      // Create audit log for the transfer
      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entityType: "StockAllocation",
          entityId: "TRANSFER_OPERATION",
          action: "STOCK_TRANSFER",
          details: {
            fromWarehouse: fromWarehouse,
            toWarehouse: toWarehouse,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
            },
            quantity: validatedData.quantity,
            reason: validatedData.reason,
            notes: validatedData.notes,
            sourceAllocationBefore: {
              id: sourceAllocation.id,
              allocatedQuantity: sourceAllocation.allocatedQuantity,
            },
            sourceAllocationAfter: {
              id: updatedSource.id,
              allocatedQuantity: updatedSource.allocatedQuantity,
            },
            destAllocationBefore: destAllocation ? {
              id: destAllocation.id,
              allocatedQuantity: destAllocation.allocatedQuantity,
            } : null,
            destAllocationAfter: {
              id: updatedDest.id,
              allocatedQuantity: updatedDest.allocatedQuantity,
            },
          },
          changedById: authResult.user.id,
          User: { connect: { id: authResult.user.id } },
        },
      });

      return {
        sourceAllocation: updatedSource,
        destAllocation: updatedDest,
        transferId: `TRANS-${Date.now()}`,
      };
    });

    return NextResponse.json({
      message: "Stock transfer completed successfully",
      transfer: {
        id: result.transferId,
        fromWarehouse,
        toWarehouse,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        },
        quantity: validatedData.quantity,
        reason: validatedData.reason,
        notes: validatedData.notes,
        transferredAt: new Date().toISOString(),
        transferredBy: {
          id: authResult.user.id,
          name: authResult.user.firstName + " " + authResult.user.lastName,
        },
      },
      sourceWarehouse: {
        ...fromWarehouse,
        newAllocatedQuantity: result.sourceAllocation.allocatedQuantity,
        newAvailableStock: getAvailableStock(result.sourceAllocation),
      },
      destinationWarehouse: {
        ...toWarehouse,
        newAllocatedQuantity: result.destAllocation.allocatedQuantity,
        newAvailableStock: getAvailableStock(result.destAllocation),
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error processing stock transfer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}