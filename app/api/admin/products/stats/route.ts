import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get basic product statistics
    const [
      totalProducts,
      totalBusinesses,
      recentProducts
    ] = await Promise.all([
      // Total products count
      prisma.product.count(),
      
      // Total businesses with products
      prisma.business.count({
        where: {
          Product: {
            some: {}
          },
          deletedAt: null
        }
      }),
      
      // Recent products (last 5)
      prisma.product.findMany({
        take: 5,
        orderBy: {
          id: 'desc'
        },
        include: {
          Business: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // Try to get stock allocation data with fallback
    let stockData = null;
    let lowStockCount = 0;
    try {
      const stockAllocationsData = await prisma.stockAllocation.aggregate({
        _sum: {
          allocatedQuantity: true,
          safetyStock: true
        }
      });
      stockData = stockAllocationsData;

      // Get low stock items count
      const lowStockItems = await prisma.stockAllocation.count({
        where: {
          allocatedQuantity: {
            lte: 10 // Using a default safety stock threshold
          }
        }
      });
      lowStockCount = lowStockItems;
    } catch (error) {
      console.warn('Stock allocation data not available:', error);
      // Continue without stock data
    }

    // Try to get warehouse stats with fallback
    let warehouseStats: {
      id: string;
      name: string;
      code: string | null;
      region: string;
      _count: {
        StockAllocation: number;
      };
    }[] = [];
    try {
      warehouseStats = await prisma.warehouse.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          region: true,
          _count: {
            select: {
              StockAllocation: true
            }
          }
        },
        take: 10 // Limit to prevent performance issues
      });
    } catch (error) {
      console.warn('Warehouse data not available:', error);
      // Continue without warehouse data
    }

    // Get top businesses by product count
    const topBusinesses = await prisma.business.findMany({
      where: {
        deletedAt: null,
        Product: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            Product: true
          }
        }
      },
      orderBy: {
        Product: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Calculate total inventory weight
    const inventoryValue = await prisma.product.aggregate({
      _sum: {
        weightKg: true
      }
    });

    const stats = {
      totalProducts,
      activeBusinesses: totalBusinesses,
      totalStock: stockData?._sum.allocatedQuantity || 0,
      lowStockItems: lowStockCount,
      totalInventoryWeight: inventoryValue._sum.weightKg || 0,
      
      // Inventory breakdown
      inventoryStatus: {
        totalStock: stockData?._sum.allocatedQuantity || 0,
        safetyStock: stockData?._sum.safetyStock || 0,
        lowStockItems: lowStockCount,
        availableStock: Math.max(0, (stockData?._sum.allocatedQuantity || 0) - (stockData?._sum.safetyStock || 0))
      },
      
      // Recent activity
      recentProducts: recentProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        businessName: product.Business?.name || 'Unknown',
        weightKg: product.weightKg
      })),
      
      // Warehouse statistics
      warehouseStats: warehouseStats.map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code || 'N/A',
        region: warehouse.region,
        productCount: warehouse._count?.StockAllocation || 0
      })),
      
      // Top businesses
      topBusinesses: topBusinesses.map((business: any) => ({
        id: business.id,
        name: business.name,
        productCount: business._count?.Product || 0
      })),
      
      // Summary metrics
      metrics: {
        averageProductsPerBusiness: totalBusinesses > 0 ? Math.round(totalProducts / totalBusinesses) : 0,
        totalWarehouses: warehouseStats.length,
        stockUtilization: stockData?._sum.allocatedQuantity && stockData?._sum.safetyStock 
          ? Math.round(((stockData._sum.allocatedQuantity - stockData._sum.safetyStock) / stockData._sum.allocatedQuantity) * 100)
          : 0
      }
    };

    return NextResponse.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch product statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}