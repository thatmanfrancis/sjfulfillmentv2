import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Revenue data for the last 6 months
    const revenueData = await prisma.order.groupBy({
      by: ['orderDate'],
      where: {
        status: 'DELIVERED',
        orderDate: { gte: sixMonthsAgo }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    // Group revenue by month
    const monthlyRevenue = revenueData.reduce((acc: any[], order: any) => {
      const month = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short' });
      const existing = acc.find(item => item.month === month);
      
      if (existing) {
        existing.revenue += order._sum?.totalAmount || 0;
        existing.orders += order._count?.id || 0;
      } else {
        acc.push({
          month,
          revenue: order._sum?.totalAmount || 0,
          orders: order._count?.id || 0,
          sales: (order._sum?.totalAmount || 0) / 1000 // Simplified sales metric
        });
      }
      return acc;
    }, []);

    // Sales data (similar to revenue but with different metrics)
        const salesData = monthlyRevenue.map((item: any) => ({
      month: item.month,
      sales: Math.round(item.revenue / 100), // Convert to smaller units for display
      orders: item.orders,
      revenue: item.revenue
    }));

    // User growth data
    const userGrowthData = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        isVerified: true,
        createdAt: { gte: sixMonthsAgo }
      },
      _count: { id: true }
    });

    const monthlyUserGrowth = userGrowthData.reduce((acc: any[], user: any) => {
      const month = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short' });
      const existing = acc.find(item => item.month === month);
      
      if (existing) {
        existing.users += user._count?.id || 0;
      } else {
        acc.push({
          month,
          users: user._count?.id || 0,
          businesses: 0 // Will be filled separately
        });
      }
      return acc;
    }, []);

    // Business growth data
    const businessGrowthData = await prisma.business.groupBy({
      by: ['createdAt'],
      where: {
        isActive: true,
        createdAt: { gte: sixMonthsAgo }
      },
      _count: { id: true }
    });

    businessGrowthData.forEach((business: any) => {
      const month = new Date(business.createdAt).toLocaleDateString('en-US', { month: 'short' });
      const existing = monthlyUserGrowth.find((item: any)=> item.month === month);
      if (existing) {
        existing.businesses += business._count?.id || 0;
      }
    });

    // Since Product doesn't have category field in schema, let's create mock category data for now
    // TODO: Add category field to Product model later
    const categoryData = [
      { name: 'General Products', value: 100, amount: 100000, color: '#f8c017' }
    ];

    // Daily revenue for the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const dailyRevenue = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const prevWeekDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const prevStartOfDay = new Date(prevWeekDate);
      prevStartOfDay.setHours(0, 0, 0, 0);
      const prevEndOfDay = new Date(prevWeekDate);
      prevEndOfDay.setHours(23, 59, 59, 999);

      const currentRevenue = await prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          orderDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: { totalAmount: true }
      });

      const previousRevenue = await prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          orderDate: {
            gte: prevStartOfDay,
            lte: prevEndOfDay
          }
        },
        _sum: { totalAmount: true }
      });

      dailyRevenue.push({
        day: dayNames[date.getDay()],
        current: currentRevenue._sum.totalAmount || 0,
        previous: previousRevenue._sum.totalAmount || 0
      });
    }

    const chartData = {
      revenue: monthlyRevenue,
      sales: salesData,
      userGrowth: monthlyUserGrowth,
      categories: categoryData,
      dailyRevenue
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Error fetching admin charts data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts data' },
      { status: 500 }
    );
  }
}

function getColorForCategory(category: string | null): string {
  const colors = {
    'Electronics': '#f8c017',
    'Fashion': '#1a1a1a',
    'Home & Garden': '#2a2a2a',
    'Sports': '#404040',
    'Books': '#ffd700',
    'Health': '#f8c017',
    'Automotive': '#1a1a1a',
    'default': '#666666'
  };
  
  return colors[category as keyof typeof colors] || colors.default;
}