import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params;
    
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    // Get warehouse with stock allocations
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        StockAllocation: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                sku: true,
                Business: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      );
    }

    // Transform products data
    const products = warehouse.StockAllocation.map(allocation => ({
      productId: allocation.Product.id,
      productName: allocation.Product.name,
      productSku: allocation.Product.sku,
      allocatedQuantity: allocation.allocatedQuantity,
      safetyStock: allocation.safetyStock,
      businessName: allocation.Product.Business.name
    }));

    return NextResponse.json({ products });

  } catch (error) {
    console.error('Failed to fetch warehouse products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}