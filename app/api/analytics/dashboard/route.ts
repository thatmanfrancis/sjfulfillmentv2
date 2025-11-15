import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CurrencyService } from "@/lib/currency";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const currency = searchParams.get('currency') || 'NGN';

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let businessFilter: any = {};
    let warehouseFilter: any = {};
    
    // Apply role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      businessFilter = { businessId: authResult.user.businessId };
    } else if (authResult.user.role === "LOGISTICS") {
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true }
      });
      const warehouseIds = userRegions.map((ur) => ur.warehouseId);
      if (warehouseIds.length > 0) {
        warehouseFilter = { id: { in: warehouseIds } };
      }
    }

    // Get exchange rate if different currency requested
    let exchangeRate = 1;
    if (currency !== 'NGN') {
      try {
        exchangeRate = await CurrencyService.getExchangeRate('NGN', currency);
      } catch (error) {
        console.warn('Failed to get exchange rate, using NGN');
      }
    }

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      canceledOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      recentOrders,
      stockMovements,
      topProducts,
      warehouseStats
    ] = await Promise.all([
      // Total orders
      prisma.order.count({
        where: {
          ...businessFilter,
          orderDate: { gte: startDate }
        }
      }),
      
      // Pending orders
      prisma.order.count({
        where: {
          ...businessFilter,
          status: { in: ['NEW', 'AWAITING_ALLOC', 'DISPATCHED'] }
        }
      }),
      
      // Delivered orders
      prisma.order.count({
        where: {
          ...businessFilter,
          status: 'DELIVERED',
          orderDate: { gte: startDate }
        }
      }),
      
      // Canceled orders
      prisma.order.count({
        where: {
          ...businessFilter,
          status: { in: ['CANCELED', 'RETURNED'] },
          orderDate: { gte: startDate }
        }
      }),
      
      // Total revenue
      prisma.order.aggregate({
        where: {
          ...businessFilter,
          status: 'DELIVERED',
          orderDate: { gte: startDate }
        },
        _sum: { totalAmount: true }
      }),
      
      // Total products
      prisma.product.count({
        where: businessFilter
      }),
      
      // Low stock products
      prisma.stockAllocation.count({
        where: {
          ...warehouseFilter,
          allocatedQuantity: { lte: 10 },
          product: businessFilter.businessId ? { businessId: businessFilter.businessId } : undefined
        }
      }),
      
      // Out of stock products
      prisma.stockAllocation.count({
        where: {
          ...warehouseFilter,
          allocatedQuantity: 0,
          product: businessFilter.businessId ? { businessId: businessFilter.businessId } : undefined
        }
      }),
      
      // Total invoices
      prisma.invoice.count({
        where: {
          merchant: businessFilter.businessId ? { id: businessFilter.businessId } : undefined,
          issueDate: { gte: startDate }
        }
      }),
      
      // Paid invoices
      prisma.invoice.count({
        where: {
          merchant: businessFilter.businessId ? { id: businessFilter.businessId } : undefined,
          status: 'PAID',
          issueDate: { gte: startDate }
        }
      }),
      
      // Overdue invoices
      prisma.invoice.count({
        where: {
          merchant: businessFilter.businessId ? { id: businessFilter.businessId } : undefined,
          status: { in: ['ISSUED', 'OVERDUE'] },
          dueDate: { lt: new Date() }
        }
      }),
      
      // Recent orders
      prisma.order.findMany({
        where: {
          ...businessFilter,
          orderDate: { gte: startDate }
        },
        include: {
          Business: { select: { name: true } },
          fulfillmentWarehouse: { select: { name: true, region: true } }
        },
        orderBy: { orderDate: 'desc' },
        take: 10
      }),
      
      // Stock movements (transfers) - disabled until stockTransfer table exists
      Promise.resolve(0),
      
      // Top products by order volume
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            ...businessFilter,
            orderDate: { gte: startDate },
            status: { not: 'CANCELED' }
          }
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10
      }),
      
      // Warehouse statistics
      authResult.user.role === "ADMIN" || authResult.user.role === "LOGISTICS" 
        ? prisma.warehouse.findMany({
            where: Object.keys(warehouseFilter).length > 0 ? { id: { in: warehouseFilter.warehouseId.in } } : undefined,
            include: {
              stockAllocations: {
                select: {
                  allocatedQuantity: true,
                  safetyStock: true
                }
              },
              _count: {
                select: {
                  fulfilledOrders: {
                    where: { orderDate: { gte: startDate } }
                  }
                }
              }
            }
          })
        : []
    ]);

    // Get product details for top products
    const topProductsWithDetails = topProducts.length > 0 ? await prisma.product.findMany({
      where: {
        id: { in: topProducts.map((tp: any) => tp.productId) },
        ...businessFilter
      },
      select: {
        id: true,
        name: true,
        sku: true,
        business: { select: { name: true } }
      }
    }) : [];

    // Merge top products with their details
    const topProductsData = topProducts.map((tp: any) => {
      const productDetails = topProductsWithDetails.find(p => p.id === tp.productId);
      return {
        productId: tp.productId,
        quantity: tp._sum.quantity,
        product: productDetails
      };
    });

    // Calculate financial metrics
    const revenue = (totalRevenue._sum.totalAmount || 0) * exchangeRate;
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
    
    // Order fulfillment rate
    const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
    
    // Invoice payment rate
    const paymentRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    // Stock turnover (simplified)
    const stockLevel = warehouseStats.reduce((total: number, warehouse: any) => {
      return total + warehouse.stockAllocations.reduce((sum: number, stock: any) => sum + stock.allocatedQuantity, 0);
    }, 0);

    return NextResponse.json({
      overview: {
        period: `${days} days`,
        currency,
        exchangeRate: currency !== 'NGN' ? exchangeRate : undefined,
        generatedAt: new Date()
      },
      
      orderMetrics: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders,
        canceled: canceledOrders,
        fulfillmentRate: Math.round(fulfillmentRate * 100) / 100
      },
      
      financialMetrics: {
        totalRevenue: Math.round(revenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        formattedRevenue: CurrencyService.formatCurrency(revenue, currency),
        formattedAOV: CurrencyService.formatCurrency(averageOrderValue, currency)
      },
      
      inventoryMetrics: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        stockLevel,
        stockMovements
      },
      
      billingMetrics: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        paymentRate: Math.round(paymentRate * 100) / 100
      },
      
      warehouseMetrics: warehouseStats.map((warehouse: any) => ({
        id: warehouse.id,
        name: warehouse.name,
        region: warehouse.region,
        totalStock: warehouse.stockAllocations.reduce((sum: number, stock: any) => sum + stock.allocatedQuantity, 0),
        ordersProcessed: warehouse._count.fulfilledOrders,
        utilizationRate: warehouse.stockAllocations.length > 0 
          ? Math.round((warehouse.stockAllocations.filter((s: any) => s.allocatedQuantity > s.safetyStock).length / warehouse.stockAllocations.length) * 100)
          : 0
      })),
      
      recentActivity: recentOrders.map((order: any) => ({
        id: order.id,
        externalOrderId: order.externalOrderId,
        customerName: order.customerName,
        status: order.status,
        totalAmount: Math.round(order.totalAmount * exchangeRate * 100) / 100,
        formattedAmount: CurrencyService.formatCurrency(order.totalAmount * exchangeRate, currency),
        orderDate: order.orderDate,
        merchantName: order.merchant.name,
        warehouseName: order.fulfillmentWarehouse?.name || 'Unassigned'
      })),
      
      topProducts: topProductsData,
      
      insights: {
        stockAlerts: lowStockProducts + outOfStockProducts,
        overdueInvoices,
        pendingOrders,
        recommendations: [
          ...(fulfillmentRate < 90 ? ['Consider reviewing order fulfillment processes'] : []),
          ...(lowStockProducts > 0 ? [`${lowStockProducts} products need restocking`] : []),
          ...(overdueInvoices > 0 ? [`${overdueInvoices} invoices are overdue`] : []),
          ...(paymentRate < 95 ? ['Follow up on outstanding invoice payments'] : [])
        ]
      }
    });

  } catch (error) {
    console.error("Error generating analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}