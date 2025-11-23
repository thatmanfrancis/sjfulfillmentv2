import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

// POST /api/admin/products/bulk-move
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const { moves } = body;
    if (!Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json({ error: 'Missing moves array' }, { status: 400 });
    }
    const results = [];
    for (const move of moves) {
      const { productId, fromWarehouseId, toWarehouseId, quantity } = move;
      if (!productId || !fromWarehouseId || !toWarehouseId || !quantity || quantity < 1) {
        results.push({ productId, success: false, error: 'Missing required fields in move' });
        continue;
      }
      // Validate warehouses
      const fromWarehouse = await prisma.warehouse.findUnique({ where: { id: fromWarehouseId } });
      const toWarehouse = await prisma.warehouse.findUnique({ where: { id: toWarehouseId } });
      if (!fromWarehouse || !toWarehouse) {
        results.push({ productId, success: false, error: 'Invalid warehouse(s)' });
        continue;
      }
      try {
        // Find allocation in source warehouse
        const allocation = await prisma.stockAllocation.findFirst({
          where: { productId, warehouseId: fromWarehouseId },
        });
        if (!allocation || allocation.allocatedQuantity < quantity) {
          results.push({ productId, success: false, error: 'Insufficient stock in source warehouse' });
          continue;
        }
        // Deduct from source
        await prisma.stockAllocation.update({
          where: { id: allocation.id },
          data: { allocatedQuantity: allocation.allocatedQuantity - quantity },
        });
        // Add to destination (create or update)
        let destAlloc = await prisma.stockAllocation.findFirst({
          where: { productId, warehouseId: toWarehouseId },
        });
        if (destAlloc) {
          await prisma.stockAllocation.update({
            where: { id: destAlloc.id },
            data: { allocatedQuantity: destAlloc.allocatedQuantity + quantity },
          });
        } else {
          await prisma.stockAllocation.create({
            data: {
              id: `stock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
              productId,
              warehouseId: toWarehouseId,
              allocatedQuantity: quantity,
              safetyStock: 0,
            },
          });
        }
        // Audit log
        await prisma.auditLog.create({
          data: {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            entityType: 'Product',
            entityId: productId,
            action: 'BULK_MOVED',
            details: {
              fromWarehouseId,
              toWarehouseId,
              quantity,
            },
            changedById: session.userId,
          },
        });
        results.push({ productId, success: true });
      } catch (err: any) {
        results.push({ productId, success: false, error: err.message });
      }
    }
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
