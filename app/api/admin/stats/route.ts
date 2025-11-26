import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get current month and previous month for comparison
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Parallel queries for better performance
    const [
      totalUsers,
      totalMerchants,
      totalProducts,
      totalOrders,
      totalShipments,
      newSignupsThisMonth,
      currentMonthRevenue,
      pendingOrders,
      activeShipments,
      recentOrderActivity,
      topMerchants
    ] = await Promise.all([
      // Total users count
      prisma.user.count({
        where: { isVerified: true }
      }),

      // Total active merchants
      prisma.user.count({
        where: { 
          role: 'MERCHANT',
          isVerified: true,
          Business_User_businessIdToBusiness: {
            isActive: true
          }
        }
      }),

      // Total products
      prisma.product.count(),

      // Total orders
      prisma.order.count(),

      // Total shipments
      prisma.shipment.count(),

      // New signups this month
      prisma.user.count({
        where: {
          createdAt: { gte: currentMonth },
          isVerified: true
        }
      }),

      // Current month revenue (sum of completed orders)
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          orderDate: { gte: currentMonth }
        },
        _sum: { totalAmount: true }
      }),

      // Pending orders
      prisma.order.count({
        where: {
          status: { in: ['NEW', 'AWAITING_ALLOC', 'DELIVERING'] }
        }
      }),

      // Active shipments (orders in transit)
      prisma.order.count({
        where: {
          status: { in: ['PICKED_UP', 'DELIVERING'] }
        }
      }),

      // Recent orders for activity feed
      prisma.order.findMany({
        where: {
          orderDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          status: true,
          orderDate: true,
          Business: {
            select: { name: true }
          }
        },
        orderBy: { orderDate: 'desc' },
        take: 10
      }),

      // Top merchants by revenue this month
      prisma.order.groupBy({
        by: ['merchantId'],
        where: {
          status: 'DELIVERED',
          orderDate: { gte: currentMonth }
        },
        _sum: { totalAmount: true },
        _count: { id: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5
      })
    ]);

    // Get business names for top merchants
    const topMerchantsWithNames = await Promise.all(
      topMerchants.map(async (merchant: any) => {
        const business = await prisma.business.findUnique({
          where: { id: merchant.merchantId },
          select: { name: true }
        });
        return {
          id: merchant.merchantId,
          name: business?.name || 'Unknown Business',
          revenue: merchant._sum?.totalAmount || 0,
          orders: merchant._count?.id || 0,
          rating: 4.5 // You can implement actual rating system later
        };
      })
    );

    // Format recent activity from orders
    const recentActivity = recentOrderActivity.map((order: any, index: number) => ({
      id: `order-${order.id}`,
      type: 'order' as const,
      message: `New order from ${order.customerName} - ₦${order.totalAmount.toLocaleString()}`,
      timestamp: order.orderDate.toLocaleString(),
      status: order.status === 'DELIVERED' ? 'success' as const : 
              order.status === 'CANCELED' || order.status === 'RETURNED' ? 'error' as const :
              order.status === 'ON_HOLD' ? 'warning' as const : 'info' as const
    }));

    // Add recent user signups to activity
    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        isVerified: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const userActivity = recentUsers.map((user: any) => ({
      id: `user-${user.id}`,
      type: 'user' as const,
      message: `New ${user.role.toLowerCase()} signup: ${user.firstName} ${user.lastName}`,
      timestamp: user.createdAt.toLocaleString(),
      status: 'info' as const
    }));

    const allActivity = [...recentActivity, ...userActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    const stats = {
      totalUsers,
      totalMerchants,
      totalProducts,
      totalOrders,
      totalShipments,
      monthlyRevenue: currentMonthRevenue._sum.totalAmount || 0,
      newSignups: newSignupsThisMonth,
      pendingOrders,
      activeShipments,
      systemHealth: {
        uptime: 99.9,
        performance: 98,
        security: 100
      },
      recentActivity: allActivity,
      topMerchants: topMerchantsWithNames,
      alerts: [] // You can implement alerts system later
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}