import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = await getCurrentSession();
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Fetch admin dashboard statistics
    const [
      totalBusinesses,
      totalUsers,
      totalOrders,
      revenueData,
      pendingBusinesses,
      systemHealth
    ] = await Promise.all([
      // Count total businesses
      prisma.business.count(),

      // Count total users
      prisma.user.count(),

      // Count total orders across all businesses
      prisma.order.count(),

      // Calculate total platform revenue
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // Get pending business approvals
      prisma.business.count({
        where: {
          onboardingStatus: 'PENDING_VERIFICATION'
        }
      }),

      // System health metrics (placeholder)
      Promise.resolve({
        uptime: 99.8,
        responseTime: 245,
        errorRate: 0.02
      })
    ]);

    // Calculate month-over-month growth
    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
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
    const monthlyGrowth = previousRevenue > 0 
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    // Get recent system activities
    const recentActivities = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    const dashboardData = {
      totalBusinesses,
      totalUsers,
      totalOrders,
      totalRevenue: currentRevenue,
      monthlyGrowth,
      pendingApprovals: pendingBusinesses,
      systemHealth,
      recentActivities: recentActivities.map((activity: any) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        user: 'System', // Simplified since changedBy relation doesn't exist
        timestamp: activity.timestamp,
        details: activity.details
      }))
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}