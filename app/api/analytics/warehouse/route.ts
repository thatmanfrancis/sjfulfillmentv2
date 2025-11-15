import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admin and logistics can access warehouse analytics
    if (!['ADMIN', 'LOGISTICS'].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const period = searchParams.get('period') || '30'; // days

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let warehouseFilter: any = {};
    
    // Apply role-based filtering for logistics users
    if (authResult.user.role === "LOGISTICS") {
      // Get user warehouse access via LogisticsRegion  
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true }
      });
      
      const accessibleWarehouses = userRegions.map(region => region.warehouseId);
      
      if (warehouseId) {
        if (!accessibleWarehouses.includes(warehouseId)) {
          return NextResponse.json({ error: "Access denied to this warehouse" }, { status: 403 });
        }
        warehouseFilter = { id: warehouseId };
      } else {
        warehouseFilter = { id: { in: accessibleWarehouses } };
      }
    } else {
      // Admin can access all warehouses
      if (warehouseId) {
        warehouseFilter = { id: warehouseId };
      }
    }

    const warehouses = await prisma.warehouse.findMany({
      where: warehouseFilter,
      include: {
        stockAllocations: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                business: { select: { name: true } }
              }
            }
          }
        },
        fulfilledOrders: {
          where: { orderDate: { gte: startDate } },
          include: {
            Business: { select: { name: true } },
            items: { 
              include: { 
                product: { select: { name: true, sku: true } }
              }
            }
          }
        },
        // transfers commented out as stockTransfer table doesn't exist yet
        // transfersTo: {
        //   where: { createdAt: { gte: startDate } },
        //   include: {
        //     product: { select: { name: true, sku: true } }
        //   }
        // },
        // transfersFrom: {
        //   where: { createdAt: { gte: startDate } },
        //   include: {
        //     product: { select: { name: true, sku: true } },
        //     toWarehouse: { select: { name: true, region: true } }
        //   }
        // }
      }
    });

    const analytics = warehouses.map((warehouse: any) => {
      // Calculate basic metrics
      const totalStock = warehouse.stockAllocations.reduce((sum: number, stock: any) => sum + stock.allocatedQuantity, 0);
      const totalCapacity = warehouse.stockAllocations.reduce((sum: number, stock: any) => sum + stock.safetyStock * 5, 0); // Assume max capacity is 5x safety stock
      const utilization = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0;

      // Order metrics
      const totalOrders = warehouse.fulfilledOrders.length;
      const totalRevenue = warehouse.fulfilledOrders.reduce((sum: number, order: any) =>
        sum + order.items.reduce((itemSum: number, item: any) => itemSum + (item.quantity * 100), 0), 0 // Using fixed price since salePrice doesn't exist
      );

      // Stock movements (transfers disabled as table doesn't exist)
      const incomingQuantity = 0; // warehouse.transfersTo?.reduce((sum: number, transfer: any) => sum + transfer.quantity, 0) || 0;
      const outgoingQuantity = 0; // warehouse.transfersFrom?.reduce((sum: number, transfer: any) => sum + transfer.quantity, 0) || 0;      // Performance metrics
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const ordersPerDay = totalOrders / days;

      // Stock health analysis
      const lowStockItems = warehouse.stockAllocations.filter((stock: any) => 
        stock.allocatedQuantity > 0 && stock.allocatedQuantity <= stock.safetyStock
      );
      const outOfStockItems = warehouse.stockAllocations.filter((stock: any) => stock.allocatedQuantity === 0);
      const overStockItems = warehouse.stockAllocations.filter((stock: any) => 
        stock.allocatedQuantity > stock.safetyStock * 3
      );

      // Top products by quantity
      const topProductsByQuantity = warehouse.stockAllocations
        .sort((a: any, b: any) => b.allocatedQuantity - a.allocatedQuantity)
        .slice(0, 10)
        .map((stock: any) => ({
          product: stock.product,
          quantity: stock.allocatedQuantity,
          safetyStock: stock.safetyStock,
          status: stock.allocatedQuantity === 0 ? 'out_of_stock' : 
                  stock.allocatedQuantity <= stock.safetyStock ? 'low_stock' :
                  stock.allocatedQuantity > stock.safetyStock * 3 ? 'over_stock' : 'normal'
        }));

      // Daily order distribution
      const ordersByDay = warehouse.fulfilledOrders.reduce((acc: any, order: any) => {
        const date = order.orderDate.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Product diversity
      const uniqueBusinesses = new Set(warehouse.stockAllocations.map((stock: any) => stock.product.business.name));
      const productCategories = warehouse.stockAllocations.length;

      return {
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          region: warehouse.region,
          address: warehouse.address
        },
        metrics: {
          utilization: Math.round(utilization * 100) / 100,
          totalStock,
          totalCapacity,
          totalProducts: warehouse.stockAllocations.length,
          activeProducts: warehouse.stockAllocations.filter((s: any) => s.allocatedQuantity > 0).length
        },
        performance: {
          ordersProcessed: totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          ordersPerDay: Math.round(ordersPerDay * 100) / 100,
          ordersByDay
        },
        stockHealth: {
          normal: warehouse.stockAllocations.length - lowStockItems.length - outOfStockItems.length - overStockItems.length,
          lowStock: lowStockItems.length,
          outOfStock: outOfStockItems.length,
          overStock: overStockItems.length,
          lowStockItems: lowStockItems.map((item: any) => ({
            product: item.product,
            currentQuantity: item.allocatedQuantity,
            safetyStock: item.safetyStock
          })),
          outOfStockItems: outOfStockItems.map((item: any) => ({
            product: item.product,
            safetyStock: item.safetyStock
          }))
        },
        stockMovements: {
          incoming: {
            total: incomingQuantity,
            // transfers disabled as table doesn't exist
            transfers: []
          },
          outgoing: {
            total: outgoingQuantity,
            // transfers disabled as table doesn't exist  
            transfers: []
          },
          netMovement: incomingQuantity - outgoingQuantity
        },
        topProducts: topProductsByQuantity,
        diversity: {
          businessCount: uniqueBusinesses.size,
          businesses: Array.from(uniqueBusinesses),
          productCategories
        },
        alerts: [
          ...(lowStockItems.length > 0 ? [`${lowStockItems.length} items are running low`] : []),
          ...(outOfStockItems.length > 0 ? [`${outOfStockItems.length} items are out of stock`] : []),
          ...(overStockItems.length > 0 ? [`${overStockItems.length} items may be overstocked`] : []),
          ...(utilization > 90 ? ['Warehouse utilization is very high'] : []),
          ...(utilization < 20 ? ['Warehouse utilization is very low'] : []),
          ...(ordersPerDay < 1 && totalOrders > 0 ? ['Order processing rate is low'] : [])
        ],
        recommendations: [
          ...(lowStockItems.length > 5 ? ['Consider increasing safety stock levels'] : []),
          ...(utilization > 85 ? ['Consider expanding warehouse capacity or optimizing layout'] : []),
          ...(outgoingQuantity > incomingQuantity * 2 ? ['Monitor incoming stock transfers'] : []),
          ...(overStockItems.length > 0 ? ['Review product demand patterns and adjust stock levels'] : [])
        ]
      };
    });

    // Summary across all warehouses (if multiple)
    const summary = warehouses.length > 1 ? {
      totalWarehouses: warehouses.length,
      totalStock: analytics.reduce((sum, w) => sum + w.metrics.totalStock, 0),
      totalOrders: analytics.reduce((sum, w) => sum + w.performance.ordersProcessed, 0),
      totalRevenue: analytics.reduce((sum, w) => sum + w.performance.totalRevenue, 0),
      averageUtilization: analytics.reduce((sum, w) => sum + w.metrics.utilization, 0) / analytics.length,
      totalAlerts: analytics.reduce((sum, w) => sum + w.alerts.length, 0)
    } : null;

    return NextResponse.json({
      period: `${days} days`,
      generatedAt: new Date(),
      summary,
      warehouses: analytics
    });

  } catch (error) {
    console.error("Error generating warehouse analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}