import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is logistics staff or admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || !["LOGISTICS", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Get logistics analytics data
    const [
      totalShipments,
      previousShipments,
      deliveredOrders,
      previousDeliveredOrders,
      inTransitOrders,
      pendingOrders,
      cancelledOrders,
      ordersByStatus,
      averageDeliveryTime,
      totalRoutes,
      recentShipments,
      warehouseRegions,
    ] = await Promise.all([
      // Current period shipments (orders with shipments)
      prisma.order.count({
        where: {
          orderDate: { gte: startDate, lte: endDate },
          Shipment: { isNot: null },
        },
      }),
      // Previous period shipments
      prisma.order.count({
        where: {
          orderDate: { gte: previousStartDate, lt: previousEndDate },
          Shipment: { isNot: null },
        },
      }),
      // Delivered orders
      prisma.order.count({
        where: {
          status: "DELIVERED",
          orderDate: { gte: startDate, lte: endDate },
          Shipment: { isNot: null },
        },
      }),
      // Previous delivered orders
      prisma.order.count({
        where: {
          status: "DELIVERED",
          orderDate: { gte: previousStartDate, lt: previousEndDate },
          Shipment: { isNot: null },
        },
      }),
      // In transit orders (picked up, delivering)
      prisma.order.count({
        where: {
          status: { in: ["PICKED_UP", "DELIVERING"] },
          Shipment: { isNot: null },
        },
      }),
      // Pending orders (new, awaiting allocation, assigned, going to pickup)
      prisma.order.count({
        where: {
          status: {
            in: [
              "NEW",
              "AWAITING_ALLOC",
              "ASSIGNED_TO_LOGISTICS",
              "GOING_TO_PICKUP",
            ],
          },
          Shipment: { isNot: null },
        },
      }),
      // Cancelled orders
      prisma.order.count({
        where: {
          status: { in: ["CANCELED", "RETURNED"] },
          Shipment: { isNot: null },
        },
      }),
      // Orders by status (for breakdown)
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
        where: {
          orderDate: { gte: startDate, lte: endDate },
          Shipment: { isNot: null },
        },
      }),
      // Average delivery time calculation (mock for now)
      2.4, // TODO: Calculate actual average delivery time
      // Active routes count (using logistics regions)
      prisma.logisticsRegion.count(),
      // Recent shipments
      prisma.order.findMany({
        where: {
          orderDate: { gte: startDate, lte: endDate },
          Shipment: { isNot: null },
        },
        include: {
          Business: { select: { name: true } },
          Shipment: { select: { trackingNumber: true } },
          Warehouse: { select: { region: true } },
        },
        orderBy: { orderDate: "desc" },
        take: 10,
      }),
      // Regional distribution using warehouses
      prisma.warehouse.groupBy({
        by: ["region"],
        _count: { id: true },
      }),
    ]);

    // Calculate metrics
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const shipmentsChange = calculateChange(totalShipments, previousShipments);
    const onTimeDeliveryRate =
      totalShipments > 0 ? (deliveredOrders / totalShipments) * 100 : 0;
    const previousOnTimeDeliveryRate =
      previousShipments > 0
        ? (previousDeliveredOrders / previousShipments) * 100
        : 0;
    const onTimeDeliveryChange = calculateChange(
      onTimeDeliveryRate,
      previousOnTimeDeliveryRate
    );

    // Process orders by status for shipment breakdown
    const statusMap = new Map(
      ordersByStatus.map((item) => [item.status, item._count.id])
    );
    const getDeliveredCount = () => statusMap.get("DELIVERED") || 0;
    const getInTransitCount = () =>
      (statusMap.get("PICKED_UP") || 0) + (statusMap.get("DELIVERING") || 0);
    const getPendingCount = () =>
      (statusMap.get("NEW") || 0) +
      (statusMap.get("AWAITING_ALLOC") || 0) +
      (statusMap.get("ASSIGNED_TO_LOGISTICS") || 0) +
      (statusMap.get("GOING_TO_PICKUP") || 0);
    const getCancelledCount = () =>
      (statusMap.get("CANCELED") || 0) + (statusMap.get("RETURNED") || 0);

    // Transform recent shipments
    const transformedShipments = recentShipments.map((order: any) => ({
      id: order.id,
      trackingNumber: order.Shipment?.trackingNumber || order.trackingNumber,
      status: order.status,
      origin: order.Warehouse?.region || "Unknown",
      destination: order.customerAddress,
      business: order.Business?.name || "Unknown",
      customer: order.customerName,
      createdAt: order.orderDate.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        shipments: {
          current: totalShipments,
          previous: previousShipments,
          change: Math.round(shipmentsChange * 10) / 10,
          delivered: deliveredOrders,
          inTransit: inTransitOrders,
          pending: pendingOrders,
          cancelled: cancelledOrders,
          byStatus: {
            delivered: getDeliveredCount(),
            inTransit: getInTransitCount(),
            pending: getPendingCount(),
            cancelled: getCancelledCount(),
          },
        },
        onTimeDelivery: {
          current: Math.round(onTimeDeliveryRate * 10) / 10,
          previous: Math.round(previousOnTimeDeliveryRate * 10) / 10,
          change: Math.round(onTimeDeliveryChange * 10) / 10,
        },
        avgDeliveryTime: {
          current: averageDeliveryTime,
          previous: 2.8, // Mock previous value
          change: -14.3, // Mock change
          trend: "improving",
        },
        activeRoutes: {
          current: totalRoutes,
          previous: Math.max(totalRoutes - 2, 0), // Mock previous
          change: totalRoutes > 0 ? 15.4 : 0, // Mock change
        },
        regionalDistribution: warehouseRegions.map((warehouse) => ({
          region: warehouse.region,
          shipments: warehouse._count.id,
        })),
        recentShipments: transformedShipments,
        metadata: {
          period: timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching logistics analytics:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
