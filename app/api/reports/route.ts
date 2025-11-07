import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import prisma from "@/lib/prisma";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const reportType = searchParams.get("type") || "overview";

    const { isAdmin, merchantIds } = await getUserMerchantContext(auth.userId as string);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause based on user permissions
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const returnsWhereClause: any = {
      requestedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (!isAdmin) {
      whereClause.merchantId = { in: merchantIds };
      // Returns don't have merchantId directly, they are linked through order
      returnsWhereClause.order = {
        merchantId: { in: merchantIds },
      };
    }

    // Get sales data
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        merchant: true,
      },
    });

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        order: true,
        customer: true,
      },
    });

    const returns = await prisma.return.findMany({
      where: returnsWhereClause,
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Calculate sales metrics
    const totalRevenue = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate growth (comparing with previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);
    const previousEndDate = startDate;

    const previousOrders = await prisma.order.count({
      where: {
        ...(!isAdmin && { merchantId: { in: merchantIds } }),
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
    });

    const previousPayments = await prisma.payment.aggregate({
      where: {
        ...(!isAdmin && { merchantId: { in: merchantIds } }),
        status: "COMPLETED",
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const previousRevenue = previousPayments._sum.amount || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    const ordersGrowth = previousOrders > 0 
      ? ((totalOrders - previousOrders) / previousOrders) * 100 
      : 0;

    // Top selling products
    const productSales = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        const productId = item.product.id;
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: item.product.name,
            sku: item.product.sku,
            totalSold: 0,
            revenue: 0,
          };
        }
        acc[productId].totalSold += item.quantity;
        acc[productId].revenue += item.quantity * item.unitPrice;
      });
      return acc;
    }, {} as Record<string, any>);

    const topSellingProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Top customers
    const customerData = orders.reduce((acc, order) => {
      const customerId = order.customer.id;
      if (!acc[customerId]) {
        acc[customerId] = {
          id: customerId,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
          totalOrders: 0,
          totalSpent: 0,
        };
      }
      acc[customerId].totalOrders += 1;
      acc[customerId].totalSpent += order.totalAmount;
      return acc;
    }, {} as Record<string, any>);

    const topCustomers = Object.values(customerData)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Low stock products - products where available quantity is low
    const lowStockProducts = await prisma.product.findMany({
      where: {
        ...(!isAdmin && { merchantId: { in: merchantIds } }),
        inventory: {
          some: {
            quantityAvailable: {
              lte: 10, // Consider products with 10 or fewer items as low stock
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        inventory: {
          select: {
            quantityAvailable: true,
            reorderPoint: true,
          },
        },
      },
      take: 10,
    });

    // Customer metrics
    const totalCustomers = await prisma.customer.count({
      where: !isAdmin ? { merchantId: { in: merchantIds } } : {},
    });

    const newCustomers = await prisma.customer.count({
      where: {
        ...(!isAdmin && { merchantId: { in: merchantIds } }),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Product metrics
    const totalProducts = await prisma.product.count({
      where: !isAdmin ? { merchantId: { in: merchantIds } } : {},
    });

    // Return metrics
    const totalReturns = returns.length;
    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
    const totalRefunded = returns
      .filter(r => r.refundAmount)
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    // Return reasons
    const reasonCounts = returns.reduce((acc, returnItem) => {
      const reason = returnItem.reason;
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalReturns > 0 ? (count / totalReturns) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const reportData = {
      sales: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        revenueGrowth,
        ordersGrowth,
      },
      products: {
        totalProducts,
        topSellingProducts,
        lowStockProducts,
      },
      customers: {
        totalCustomers,
        newCustomers,
        topCustomers,
      },
      returns: {
        totalReturns,
        returnRate,
        totalRefunded,
        commonReasons,
      },
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Failed to generate reports" },
      { status: 500 }
    );
  }
}