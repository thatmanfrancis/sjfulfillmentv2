import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { any } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      switch (timeRange) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }
    }

    // Calculate previous period for comparison
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    const previousEndDate = new Date(startDate);

    const [
      // Current period data
      totalOrders,
      totalRevenue,
      totalCustomers,
      activeBusinesses,
      ordersByStatus,

      // Previous period data for comparison
      previousOrders,
      previousRevenue,
      previousCustomers,
      previousBusinesses,

      // Additional metrics
      totalProducts,
      totalWarehouses,
      recentOrders,

      // Currency information
      currencyDistribution,
    ] = await Promise.all([
      // Current period
      prisma.order.count({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({
        where: {
          role: { in: ["MERCHANT_STAFF", "MERCHANT"] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.business.count({
        where: {
          isActive: true,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { id: true },
      }),

      // Previous period
      prisma.order.count({
        where: {
          orderDate: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          orderDate: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({
        where: {
          role: { in: ["MERCHANT_STAFF", "MERCHANT"] },
          createdAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
      }),
      prisma.business.count({
        where: {
          isActive: true,
          createdAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
      }),

      // Additional metrics
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.order.findMany({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          Business: { select: { name: true } },
          User: { select: { firstName: true, lastName: true } },
        },
        orderBy: { orderDate: "desc" },
        take: 10,
      }),

      // Currency distribution from businesses
      prisma.business.groupBy({
        by: ["baseCurrency"],
        _count: { baseCurrency: true },
        where: { isActive: true },
      }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentTotalRevenue = totalRevenue._sum?.totalAmount || 0;
    const previousTotalRevenue = previousRevenue._sum?.totalAmount || 0;
    const revenueChange = calculateChange(
      currentTotalRevenue,
      previousTotalRevenue
    );

    const ordersChange = calculateChange(totalOrders, previousOrders);
    const customersChange = calculateChange(totalCustomers, previousCustomers);
    const businessesChange = calculateChange(
      activeBusinesses,
      previousBusinesses
    );

    // Process order status distribution
    const orderStatusMap = new Map(
      ordersByStatus.map((item) => [item.status, item._count.id])
    );
    const getOrderCount = (status: string) =>
      orderStatusMap.get(status as any) || 0;

    const transformedOrders = recentOrders.map((order: any) => ({
      id: order.id,
      business: order.Business?.name || "Unknown Business",
      customer: `${order.User?.firstName || "Unknown"} ${
        order.User?.lastName || "User"
      }`,
      amount: order.totalAmount,
      status: order.status,
      date:
        (order.orderDate || order.createdAt)?.toISOString() ||
        new Date().toISOString(),
    }));

    // Calculate average order value
    const avgOrderValue =
      totalOrders > 0 ? currentTotalRevenue / totalOrders : 0;
    const previousAvgOrderValue =
      previousOrders > 0 ? previousTotalRevenue / previousOrders : 0;
    const avgOrderValueChange = calculateChange(
      avgOrderValue,
      previousAvgOrderValue
    );

    // Determine primary currency (most used by businesses)
    const primaryCurrency =
      currencyDistribution.length > 0
        ? currencyDistribution.reduce((a, b) =>
            a._count.baseCurrency > b._count.baseCurrency ? a : b
          ).baseCurrency
        : "USD";

    return NextResponse.json({
      success: true,
      analytics: {
        revenue: {
          current: currentTotalRevenue,
          previous: previousTotalRevenue,
          change: Math.round(revenueChange * 10) / 10,
          thisMonth: currentTotalRevenue,
          lastMonth: previousTotalRevenue,
          growth: Math.round(revenueChange * 10) / 10,
          currency: primaryCurrency,
          daily: [], // TODO: Implement daily breakdown
        },
        orders: {
          current: totalOrders,
          previous: previousOrders,
          change: Math.round(ordersChange * 10) / 10,
          pending: getOrderCount("PENDING"),
          completed: getOrderCount("COMPLETED") + getOrderCount("DELIVERED"),
          cancelled: getOrderCount("CANCELLED"),
          processing: getOrderCount("PROCESSING") + getOrderCount("CONFIRMED"),
          dailyAverage: Math.round(totalOrders / Math.max(periodDays, 1)),
        },
        users: {
          current: totalCustomers,
          previous: previousCustomers,
          change: Math.round(customersChange * 10) / 10,
          active: Math.floor(totalCustomers * 0.75), // Estimate
          new: totalCustomers,
          returning: Math.floor(totalCustomers * 0.6), // Estimate
          engagement: 74.5, // Mock value
        },
        merchants: {
          current: activeBusinesses,
          previous: previousBusinesses,
          change: Math.round(businessesChange * 10) / 10,
          active: activeBusinesses,
          pending: 0, // TODO: Implement pending businesses
          verified: Math.floor(activeBusinesses * 0.85), // Estimate
          topPerformer: "Tech Solutions Ltd", // Mock value
        },
        conversion: {
          current: 4.8, // Mock value
          previous: 3.9, // Mock value
          change: 23.1, // Mock value
          checkout: 68.5, // Mock value
          payment: 94.2, // Mock value
        },
        avgOrderValue: {
          current: avgOrderValue,
          previous: previousAvgOrderValue,
          change: Math.round(avgOrderValueChange * 10) / 10,
          trend:
            avgOrderValueChange > 0
              ? "up"
              : avgOrderValueChange < 0
              ? "down"
              : "stable",
        },
        traffic: {
          sessions: totalCustomers * 3, // Mock multiplier
          pageViews: totalCustomers * 8, // Mock multiplier
          bounceRate: 32.5, // Mock value
          avgSessionDuration: "4m 32s", // Mock value
          sources: [
            { name: "Organic Search", percentage: 45.2 },
            { name: "Direct", percentage: 28.7 },
            { name: "Social Media", percentage: 15.8 },
            { name: "Email", percentage: 10.3 },
          ],
        },
        products: {
          total: totalProducts,
          topSelling: "Premium Wireless Headphones", // Mock value
          categories: 24, // Mock value
          lowStock: Math.floor(totalProducts * 0.05), // Estimate
          outOfStock: Math.floor(totalProducts * 0.01), // Estimate
          newThisMonth: Math.floor(totalProducts * 0.03), // Estimate
        },
        logistics: {
          totalShipments: Math.floor(totalOrders * 0.8), // Estimate
          delivered: Math.floor(totalOrders * 0.75), // Estimate
          inTransit: getOrderCount("SHIPPED") + getOrderCount("IN_TRANSIT"),
          pending: getOrderCount("PENDING"),
          avgDeliveryTime: "3.2 days", // Mock value
          successRate: 97.8, // Mock value
        },
        payments: {
          successful: Math.floor(totalOrders * 0.95), // Estimate
          failed: Math.floor(totalOrders * 0.03), // Estimate
          pending: getOrderCount("PENDING"),
          refunds: Math.floor(totalOrders * 0.01), // Estimate
          successRate: 97.3, // Mock value
          popularMethod: "Bank Transfer", // Mock value
        },
        recentOrders: transformedOrders,
        metadata: {
          totalProducts,
          totalWarehouses,
          primaryCurrency,
          currencyDistribution: currencyDistribution.map((c) => ({
            currency: c.baseCurrency,
            businessCount: c._count.baseCurrency,
          })),
          period: timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
