import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import prisma from "@/lib/prisma";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: (auth.status as number) || 401 }
    );
  }

  try {
    const { isAdmin, merchantIds } = await getUserMerchantContext(auth.userId as string);
    
    // Get user details separately
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Base date filters
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build query filters based on role
    const orderFilter = isAdmin ? {} : { merchantId: { in: merchantIds } };
    const productFilter = isAdmin ? {} : { merchantId: { in: merchantIds } };
    const customerFilter = isAdmin ? {} : { merchantId: { in: merchantIds } };
    const invoiceFilter = isAdmin ? {} : { merchantId: { in: merchantIds } };
    const shipmentFilter = isAdmin ? {} : { order: { merchantId: { in: merchantIds } } };

    // Fetch all dashboard data in parallel
    const [
      // Order statistics
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      weekOrders,
      monthOrders,

      // Revenue statistics
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      pendingPayments,

      // Product statistics
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,

      // Customer statistics
      totalCustomers,
      activeCustomers,
      newCustomersToday,
      newCustomersWeek,
      newCustomersMonth,

      // Shipment statistics
      activeShipments,
      deliveredShipmentsToday,
      inTransitShipments,
      failedShipments,

      // Warehouse statistics
      totalWarehouses,
      activeWarehouses,

      // Invoice statistics
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      draftInvoices,

      // Return statistics
      totalReturns,
      pendingReturns,
      approvedReturns,

      // Recent activities
      recentOrders,
      recentShipments,
      recentReturns,
      lowStockItems,
    ] = await Promise.all([
      // Order counts
      prisma.order.count({ where: orderFilter }),
      prisma.order.count({ where: { ...orderFilter, status: "PENDING" } }),
      prisma.order.count({ where: { ...orderFilter, status: "PROCESSING" } }),
      prisma.order.count({ where: { ...orderFilter, status: "SHIPPED" } }),
      prisma.order.count({ where: { ...orderFilter, status: "DELIVERED" } }),
      prisma.order.count({ where: { ...orderFilter, status: "CANCELLED" } }),
      prisma.order.count({ where: { ...orderFilter, createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { ...orderFilter, createdAt: { gte: startOfWeek } } }),
      prisma.order.count({ where: { ...orderFilter, createdAt: { gte: startOfMonth } } }),

      // Revenue aggregations
      prisma.order.aggregate({
        where: { ...orderFilter, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...orderFilter, paymentStatus: "PAID", createdAt: { gte: startOfToday } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...orderFilter, paymentStatus: "PAID", createdAt: { gte: startOfWeek } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...orderFilter, paymentStatus: "PAID", createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...orderFilter, paymentStatus: "PENDING" },
        _sum: { totalAmount: true },
      }),

      // Product counts
      prisma.product.count({ where: productFilter }),
      prisma.product.count({ where: { ...productFilter, status: "ACTIVE" } }),
      prisma.product.count({ where: { ...productFilter, status: "OUT_OF_STOCK" } }),
      // Count products with low stock (based on reorder point)
      prisma.product.findMany({
        where: {
          ...productFilter,
          status: "ACTIVE",
        },
        select: {
          id: true,
          inventory: {
            select: {
              quantityAvailable: true,
              reorderPoint: true,
            },
          },
        },
      }).then((products) => 
        products.filter((p) => 
          p.inventory.some((inv: any) => 
            inv.reorderPoint && inv.quantityAvailable <= inv.reorderPoint
          )
        ).length
      ),

      // Customer counts
      prisma.customer.count({ where: customerFilter }),
      prisma.customer.count({ where: { ...customerFilter, status: "ACTIVE" } }),
      prisma.customer.count({ where: { ...customerFilter, createdAt: { gte: startOfToday } } }),
      prisma.customer.count({ where: { ...customerFilter, createdAt: { gte: startOfWeek } } }),
      prisma.customer.count({ where: { ...customerFilter, createdAt: { gte: startOfMonth } } }),

      // Shipment counts
      prisma.shipment.count({ where: { ...shipmentFilter, status: { in: ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } } }),
      prisma.shipment.count({ where: { ...shipmentFilter, status: "DELIVERED", deliveredAt: { gte: startOfToday } } }),
      prisma.shipment.count({ where: { ...shipmentFilter, status: "IN_TRANSIT" } }),
      prisma.shipment.count({ where: { ...shipmentFilter, status: "FAILED" } }),

      // Warehouse counts
      prisma.warehouse.count({ where: isAdmin ? {} : { merchantId: { in: merchantIds } } }),
      prisma.warehouse.count({ where: { ...(isAdmin ? {} : { merchantId: { in: merchantIds } }), status: "ACTIVE" } }),

      // Invoice counts
      prisma.invoice.count({ where: invoiceFilter }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: "PAID" } }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: "OVERDUE" } }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: "DRAFT" } }),

      // Return counts
      prisma.return.count({ where: { order: orderFilter } }),
      prisma.return.count({ where: { order: orderFilter, status: "REQUESTED" } }),
      prisma.return.count({ where: { order: orderFilter, status: "APPROVED" } }),

      // Recent orders (last 5)
      prisma.order.findMany({
        where: orderFilter,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
        },
      }),

      // Recent shipments (last 5)
      prisma.shipment.findMany({
        where: shipmentFilter,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),

      // Recent returns (last 5)
      prisma.return.findMany({
        where: { order: orderFilter },
        orderBy: { requestedAt: "desc" },
        take: 5,
        select: {
          id: true,
          reason: true,
          status: true,
          requestedAt: true,
          order: {
            select: {
              orderNumber: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),

      // Low stock items (products with inventory below reorder point)
      prisma.product.findMany({
        where: {
          ...productFilter,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          sku: true,
          inventory: {
            select: {
              quantityAvailable: true,
              reorderPoint: true,
              warehouse: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        take: 50,
      }).then((products) => 
        products
          .map((product) => ({
            ...product,
            inventory: product.inventory.filter(
              (inv: any) => inv.reorderPoint && inv.quantityAvailable <= inv.reorderPoint
            ),
          }))
          .filter((product) => product.inventory.length > 0)
          .slice(0, 10)
      ),
    ]);

    // Calculate percentage changes (comparing month vs previous month for simplicity)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [previousMonthOrders, previousMonthRevenue, previousMonthCustomers] = await Promise.all([
      prisma.order.count({
        where: {
          ...orderFilter,
          createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
      prisma.order.aggregate({
        where: {
          ...orderFilter,
          paymentStatus: "PAID",
          createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count({
        where: {
          ...customerFilter,
          createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
      }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    const orderChange = calculateChange(monthOrders, previousMonthOrders);
    const revenueChange = calculateChange(
      monthRevenue._sum.totalAmount || 0,
      previousMonthRevenue._sum.totalAmount || 0
    );
    const customerChange = calculateChange(newCustomersMonth, previousMonthCustomers);

    // Product change based on active products
    const productChange = activeProducts > 0 ? "+0%" : "0%"; // Simplified

    // Format currency
    const formatCurrency = (amount: number | null, currencyCode = "USD", symbol = "$"): string => {
      if (!amount) return `${symbol}0.00`;
      return `${symbol}${amount.toFixed(2)}`;
    };

    // Default currency (use USD or first available)
    const defaultCurrency = await prisma.currency.findFirst({
      where: { code: "USD" },
      select: { code: true, symbol: true },
    });

    const currencySymbol = defaultCurrency?.symbol || "$";
    const currencyCode = defaultCurrency?.code || "USD";

    return NextResponse.json({
      success: true,
      data: {
        // Quick stats for cards
        stats: {
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            processing: processingOrders,
            shipped: shippedOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders,
            today: todayOrders,
            week: weekOrders,
            month: monthOrders,
            change: orderChange,
          },
          revenue: {
            total: formatCurrency(totalRevenue._sum.totalAmount || 0, currencyCode, currencySymbol),
            totalRaw: totalRevenue._sum.totalAmount || 0,
            today: formatCurrency(todayRevenue._sum.totalAmount || 0, currencyCode, currencySymbol),
            todayRaw: todayRevenue._sum.totalAmount || 0,
            week: formatCurrency(weekRevenue._sum.totalAmount || 0, currencyCode, currencySymbol),
            weekRaw: weekRevenue._sum.totalAmount || 0,
            month: formatCurrency(monthRevenue._sum.totalAmount || 0, currencyCode, currencySymbol),
            monthRaw: monthRevenue._sum.totalAmount || 0,
            pending: formatCurrency(pendingPayments._sum.totalAmount || 0, currencyCode, currencySymbol),
            pendingRaw: pendingPayments._sum.totalAmount || 0,
            change: revenueChange,
            currency: { code: currencyCode, symbol: currencySymbol },
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            outOfStock: outOfStockProducts,
            lowStock: lowStockProducts,
            change: productChange,
          },
          customers: {
            total: totalCustomers,
            active: activeCustomers,
            newToday: newCustomersToday,
            newWeek: newCustomersWeek,
            newMonth: newCustomersMonth,
            change: customerChange,
          },
          shipments: {
            active: activeShipments,
            deliveredToday: deliveredShipmentsToday,
            inTransit: inTransitShipments,
            failed: failedShipments,
          },
          warehouses: {
            total: totalWarehouses,
            active: activeWarehouses,
          },
          invoices: {
            total: totalInvoices,
            paid: paidInvoices,
            overdue: overdueInvoices,
            draft: draftInvoices,
          },
          returns: {
            total: totalReturns,
            pending: pendingReturns,
            approved: approvedReturns,
          },
        },

        // Recent activity
        recentActivity: {
          orders: recentOrders.map((order) => ({
            id: order.id,
            type: "order",
            message: `New order ${order.orderNumber} from ${order.customer.firstName} ${order.customer.lastName}`,
            status: order.status,
            amount: formatCurrency(order.totalAmount, order.currency.code, order.currency.symbol),
            time: order.createdAt,
            icon: "📦",
          })),
          shipments: recentShipments.map((shipment) => ({
            id: shipment.id,
            type: "shipment",
            message: `Shipment ${shipment.trackingNumber} for order ${shipment.order.orderNumber}`,
            status: shipment.status,
            time: shipment.deliveredAt || shipment.createdAt,
            icon: "🚚",
          })),
          returns: recentReturns.map((returnItem) => ({
            id: returnItem.id,
            type: "return",
            message: `Return request for order ${returnItem.order.orderNumber} - ${returnItem.reason}`,
            status: returnItem.status,
            time: returnItem.requestedAt,
            icon: "↩️",
          })),
        },

        // Low stock alerts
        lowStockAlerts: lowStockItems
          .filter((product: any) => product.inventory.length > 0)
          .map((product: any) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            inventory: product.inventory.map((inv: any) => ({
              warehouse: inv.warehouse.name,
              available: inv.quantityAvailable,
              threshold: inv.reorderPoint || 0,
            })),
          })),

        // User context
        user: {
          role: user.role,
          isAdmin,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
