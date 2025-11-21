import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get basic product statistics using available fields from the schema
    const [
      totalProducts,
      totalStockAllocations,
      lowStockAllocations
    ] = await Promise.all([
      prisma.product.count(),
      prisma.stockAllocation.aggregate({
        _sum: {
          allocatedQuantity: true
        }
      }),
      prisma.stockAllocation.count({
        where: {
          allocatedQuantity: {
            gt: 0,
            lte: 10 // Consider low stock threshold as 10
          }
        }
      })
    ]);

    // Count out of stock allocations
    const outOfStockAllocations = await prisma.stockAllocation.count({
      where: {
        allocatedQuantity: 0
      }
    });

    // Calculate total value using order data
    const totalValue = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      }
    });

    return NextResponse.json({
      stats: {
        total: totalProducts,
        lowStock: lowStockAllocations,
        outOfStock: outOfStockAllocations,
        totalValue: totalValue._sum?.totalAmount || 0,
        topSelling: 0, // Would need more complex query to calculate
        newThisMonth: 0, // Would need createdAt field on Product
        totalStock: totalStockAllocations._sum?.allocatedQuantity || 0,
      }
    });
  } catch (error) {
    console.error('Product stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}