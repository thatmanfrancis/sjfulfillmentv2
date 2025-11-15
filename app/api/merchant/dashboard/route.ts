import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Verify merchant session
    const session = await getCurrentSession();
    
    if (!session || !['MERCHANT', 'MERCHANT_STAFF'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const businessId = session.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: 'No business associated with this account' },
        { status: 400 }
      );
    }

    // Fetch merchant dashboard statistics
    const [
      totalProducts,
      totalOrders,
      revenueData,
      lowStockProducts,
      pendingShipments,
      activeCustomers,
      recentOrders
    ] = await Promise.all([
      // Count total products
      prisma.product.count({
        where: {
          businessId
        }
      }),

      // Count total orders
      prisma.order.count({
        where: { merchantId: businessId }
      }),

      // Calculate monthly revenue
      prisma.order.aggregate({
        where: {
          merchantId: businessId,
          status: 'DELIVERED',
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // Count low stock products (simplified approach)
      0, // TODO: Implement proper stock tracking

      // Count pending shipments
      prisma.order.count({
        where: {
          merchantId: businessId,
          status: 'NEW'
        }
      }),

      // Count unique customers (distinct by name since no email field)
      prisma.order.findMany({
        where: { merchantId: businessId },
        distinct: ['customerName'],
        select: {
          customerName: true
        }
      }).then(orders => orders.length),

      // Get recent orders
      prisma.order.findMany({
        where: { merchantId: businessId },
        take: 10,
        orderBy: { orderDate: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  weightKg: true
                }
              }
            }
          }
        }
      })
    ]);

    // Calculate month-over-month growth
    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
        merchantId: businessId,
        status: 'DELIVERED',
        orderDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: {
        totalAmount: true
      }
    });

    const currentRevenue = revenueData._sum?.totalAmount || 0;
    const previousRevenue = lastMonthRevenue._sum?.totalAmount || 0;
    const growthRate = previousRevenue > 0 
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    // Get top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          merchantId: businessId,
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            weightKg: true
          }
        });
        return {
          ...product,
          totalSold: item._sum?.quantity || 0
        };
      })
    );

    const dashboardData = {
      totalProducts,
      totalOrders,
      monthlyRevenue: currentRevenue,
      growthRate,
      lowStockItems: lowStockProducts,
      pendingShipments,
      activeCustomers,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        status: order.status,
        itemCount: order.items?.length || 0,
        orderDate: order.orderDate
      })),
      topProducts: topProductsWithDetails
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Merchant dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}