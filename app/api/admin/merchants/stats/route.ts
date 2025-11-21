import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get comprehensive merchant statistics
    const [
      totalMerchants,
      activeMerchants,
      inactiveMerchants,
      verifiedMerchants,
      unverifiedMerchants,
      newThisMonth,
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      recentMerchants
    ] = await Promise.all([
      // Total merchants count
      prisma.business.count({
        where: { deletedAt: null }
      }),
      
      // Active merchants
      prisma.business.count({
        where: { 
          isActive: true,
          deletedAt: null 
        }
      }),
      
      // Inactive merchants
      prisma.business.count({
        where: { 
          isActive: false,
          deletedAt: null 
        }
      }),
      
      // Verified merchants (those with verified primary users)
      prisma.business.count({
        where: {
          deletedAt: null,
          User_User_businessIdToBusiness: {
            some: {
              role: 'MERCHANT',
              isVerified: true
            }
          }
        }
      }),
      
      // Unverified merchants
      prisma.business.count({
        where: {
          deletedAt: null,
          User_User_businessIdToBusiness: {
            some: {
              role: 'MERCHANT',
              isVerified: false
            }
          }
        }
      }),

      // New merchants this month
      prisma.business.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Total revenue from all orders
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: 'CANCELED' } }
      }),
      
      // Total orders count
      prisma.order.count({
        where: { status: { not: 'CANCELED' } }
      }),

      // Total products count
      prisma.product.count(),

      // Total users count (merchant users)
      prisma.user.count({
        where: { 
          role: 'MERCHANT'
        }
      }),
      
      // Recent merchants (last 10)
      prisma.business.findMany({
        where: { deletedAt: null },
        include: {
          User_User_businessIdToBusiness: {
            where: { role: 'MERCHANT' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isVerified: true,
              createdAt: true
            },
            take: 1
          },
          _count: {
            select: {
              Order: true,
              Product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? 
      ((totalRevenue._sum?.totalAmount || 0) / totalOrders) : 0;

    // Get top merchants by revenue
    const topMerchantsByRevenue = await prisma.business.findMany({
      where: { 
        deletedAt: null,
        Order: {
          some: {}
        }
      },
      include: {
        Order: {
          select: { totalAmount: true, status: true },
          where: { status: { not: 'CANCELED' } }
        },
        User_User_businessIdToBusiness: {
          where: { role: 'MERCHANT' },
          select: { firstName: true, lastName: true, email: true },
          take: 1
        }
      },
      take: 10
    });

    const transformedTopMerchants = topMerchantsByRevenue
      .map((merchant: any) => ({
        id: merchant.id,
        name: merchant.name,
        email: merchant.User_User_businessIdToBusiness[0]?.email || '',
        contactName: merchant.User_User_businessIdToBusiness[0] ? 
          `${merchant.User_User_businessIdToBusiness[0].firstName} ${merchant.User_User_businessIdToBusiness[0].lastName}` : '',
        totalRevenue: merchant.Order?.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0) || 0,
        orderCount: merchant.Order?.length || 0,
        city: merchant.city,
        state: merchant.state,
        country: merchant.country,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt.toISOString()
      }))
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Transform recent merchants
    const transformedRecentMerchants = recentMerchants.map((merchant: any) => ({
      id: merchant.id,
      name: merchant.name,
      email: merchant.User_User_businessIdToBusiness[0]?.email || '',
      contactName: merchant.User_User_businessIdToBusiness[0] ? 
        `${merchant.User_User_businessIdToBusiness[0].firstName} ${merchant.User_User_businessIdToBusiness[0].lastName}` : '',
      isVerified: merchant.User_User_businessIdToBusiness[0]?.isVerified || false,
      city: merchant.city,
      state: merchant.state,
      country: merchant.country,
      orderCount: merchant._count.Order,
      productCount: merchant._count.Product,
      isActive: merchant.isActive,
      createdAt: merchant.createdAt.toISOString()
    }));

    // Monthly growth data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    
    const monthlyData = await prisma.business.groupBy({
      by: ['createdAt'],
      where: {
        deletedAt: null,
        createdAt: { gte: twelveMonthsAgo }
      },
      _count: { id: true }
    });

    // Group by month
    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const monthYear = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthData = monthlyData.filter(item => 
        item.createdAt.toISOString().slice(0, 7) === monthYear
      );
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthData.reduce((sum, item) => sum + item._count.id, 0)
      };
    });

    return NextResponse.json({
      totalMerchants,
      activeMerchants,
      inactiveMerchants,
      newThisMonth,
      totalProducts,
      totalUsers,
      totalRevenue: totalRevenue._sum?.totalAmount || 0,
      totalOrders,
      averageOrderValue,
      verificationRate: totalMerchants > 0 ? (verifiedMerchants / totalMerchants * 100).toFixed(1) : "0",
      activeRate: totalMerchants > 0 ? (activeMerchants / totalMerchants * 100).toFixed(1) : "0",
      topMerchants: transformedTopMerchants,
      recentMerchants: transformedRecentMerchants,
      monthlyGrowth
    });

  } catch (error) {
    console.error('Error fetching merchant stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch merchant statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}