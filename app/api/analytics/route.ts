import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// GET /api/analytics - Get comprehensive analytics dashboard data
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
    const period = searchParams.get("period") || "30"; // days
    const businessId = searchParams.get("businessId");
    const warehouseId = searchParams.get("warehouseId");

    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Build base filters based on user role
    let orderFilters: any = {
      orderDate: { gte: startDate },
    };

    let productFilters: any = {};
    let warehouseFilters: any = {};

    // Role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      orderFilters.merchantId = authResult.user.businessId;
      productFilters.merchantId = authResult.user.businessId;
    } else if (authResult.user.role === "LOGISTICS") {
      // Show data for warehouses/orders assigned to this logistics user
    // Get accessible warehouses for logistics users
    const userRegions = await prisma.logisticsRegion.findMany({
      where: { userId: authResult.user.id },
      select: { warehouseId: true }
    });

    const warehouseIds = userRegions.map((ur) => ur.warehouseId);orderFilters.OR = [
        { assignedLogisticsId: authResult.user.id },
        { fulfillmentWarehouseId: { in: warehouseIds } },
      ];
      
      warehouseFilters.id = { in: warehouseIds };
    } else if (authResult.user.role === "ADMIN") {
      // Admin can see all data, apply optional filters
      if (businessId) {
        orderFilters.merchantId = businessId;
        productFilters.merchantId = businessId;
      }
      
      if (warehouseId) {
        orderFilters.fulfillmentWarehouseId = warehouseId;
        warehouseFilters.id = warehouseId;
      }
    }

    // Get comprehensive analytics data
    const [
      orderStats,
      revenueData,
      topProducts,
      warehouseStats,
      statusDistribution,
      dailyOrders,
      customerStats,
      inventoryLevels,
    ] = await Promise.all([
      // Order Statistics
      prisma.order.aggregate({
        where: orderFilters,
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),

      // Revenue breakdown by business
      prisma.order.groupBy({
        by: ['merchantId'],
        where: {
          ...orderFilters,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: orderFilters,
        },
        _sum: { 
          quantity: true,
        },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // Warehouse performance
      prisma.warehouse.findMany({
        where: warehouseFilters,
        select: {
          id: true,
          name: true,
          region: true,
          _count: {
            select: {
              fulfilledOrders: {
                where: { orderDate: { gte: startDate } },
              },
            },
          },
        },
      }),

      // Order status distribution
      prisma.order.groupBy({
        by: ['status'],
        where: orderFilters,
        _count: { id: true },
      }),

        // Daily order trends
        prisma.$queryRaw`
          SELECT 
            DATE(order_date) as date,
            COUNT(*) as orders,
            SUM(total_amount) as revenue,
            AVG(total_amount) as avg_order_value
          FROM "Order" 
          WHERE order_date >= ${startDate}
          ${authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF" 
            ? prisma.$queryRaw`AND merchant_id = ${authResult.user.businessId}`
            : prisma.$queryRaw``}
          GROUP BY DATE(order_date)
          ORDER BY date DESC
          LIMIT 30
        `,      // Customer/Business statistics
      authResult.user.role === "ADMIN" 
        ? prisma.business.aggregate({
            _count: { id: true },
          })
        : Promise.resolve({ _count: { id: 0 } }),

      // Low stock alerts - simplified since stockLevel doesn't exist in schema
      prisma.stockAllocation.findMany({
        where: {
          allocatedQuantity: { lt: 10 },
          product: productFilters,
        },
        select: {
          id: true,
          allocatedQuantity: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              business: {
                select: { name: true },
              },
            },
          },
          warehouse: {
            select: { name: true },
          },
        },
        orderBy: { allocatedQuantity: 'asc' },
        take: 20,
      }),
    ]);

    // Enrich top products with product details
    const productIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        business: { select: { name: true } },
      },
    });

    const enrichedTopProducts = topProducts.map(product => {
      const details = productDetails.find(p => p.id === product.productId);
      return {
        ...product,
        productName: details?.name || 'Unknown',
        productSku: details?.sku || 'N/A',
        businessName: details?.business?.name || 'Unknown',
      };
    });

    // Enrich revenue data with business details
    const businessIds = revenueData.map(r => r.merchantId);
    const businessDetails = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, name: true, baseCurrency: true },
    });

    const enrichedRevenueData = revenueData.map(revenue => {
      const business = businessDetails.find(b => b.id === revenue.merchantId);
      return {
        ...revenue,
        businessName: business?.name || 'Unknown',
        currency: business?.baseCurrency || 'USD',
      };
    });

    // Calculate growth rates
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysBack);

    const previousPeriodOrders = await prisma.order.aggregate({
      where: {
        ...orderFilters,
        orderDate: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const orderGrowth = previousPeriodOrders._count.id > 0 
      ? ((orderStats._count.id - previousPeriodOrders._count.id) / previousPeriodOrders._count.id) * 100
      : 0;

    const revenueGrowth = (previousPeriodOrders._sum.totalAmount || 0) > 0 
      ? (((orderStats._sum.totalAmount || 0) - (previousPeriodOrders._sum.totalAmount || 0)) / (previousPeriodOrders._sum.totalAmount || 1)) * 100
      : 0;

    return NextResponse.json({
      summary: {
        totalOrders: orderStats._count.id,
        totalRevenue: orderStats._sum.totalAmount || 0,
        averageOrderValue: orderStats._avg.totalAmount || 0,
        orderGrowth: Math.round(orderGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        period: daysBack,
      },
      charts: {
        dailyTrends: dailyOrders,
        statusDistribution: statusDistribution.map(stat => ({
          status: stat.status,
          count: stat._count.id,
          percentage: Math.round((stat._count.id / orderStats._count.id) * 100),
        })),
        revenueByBusiness: enrichedRevenueData.slice(0, 10),
      },
      rankings: {
        topProducts: enrichedTopProducts,
        warehousePerformance: warehouseStats.map(warehouse => ({
          ...warehouse,
          ordersFulfilled: warehouse._count.fulfilledOrders,
        })),
      },
      alerts: {
        lowStockAllocations: inventoryLevels.map(item => ({
          id: item.id,
          stockLevel: item.allocatedQuantity,
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          businessName: item.product.business.name,
          warehouseName: item.warehouse.name,
        })),
        totalCustomers: customerStats._count.id,
      },
      metadata: {
        generatedAt: new Date(),
        period: `${daysBack} days`,
        userRole: authResult.user.role,
        filters: {
          businessId: businessId || null,
          warehouseId: warehouseId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error generating analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}