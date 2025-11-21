import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';

interface ReportFilters {
  type?: string;
  dateRange?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const dateRange = searchParams.get('dateRange') || '30';
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Calculate date range
    const daysAgo = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get available report types based on user role
    const availableReports = [
      {
        id: 'sales-performance',
        name: 'Sales Performance Report',
        type: 'SALES',
        description: 'Comprehensive sales analysis with revenue, order trends, and merchant performance',
        format: 'PDF',
        category: 'Financial',
      },
      {
        id: 'inventory-status',
        name: 'Inventory Status Report',
        type: 'INVENTORY',
        description: 'Current stock levels, low stock alerts, and inventory valuation',
        format: 'Excel',
        category: 'Inventory',
      },
      {
        id: 'merchant-activity',
        name: 'Merchant Activity Report',
        type: 'MERCHANT',
        description: 'Merchant usage statistics, billing summaries, and account status',
        format: 'PDF',
        category: 'Business',
      },
      {
        id: 'logistics-performance',
        name: 'Logistics Performance Report',
        type: 'LOGISTICS',
        description: 'Delivery performance, route optimization, and logistics costs',
        format: 'PDF',
        category: 'Operations',
      },
      {
        id: 'financial-summary',
        name: 'Financial Summary Report',
        type: 'FINANCIAL',
        description: 'Revenue, expenses, profit analysis, and financial trends',
        format: 'PDF',
        category: 'Financial',
      },
      {
        id: 'customer-analytics',
        name: 'Customer Analytics Report',
        type: 'CUSTOMER',
        description: 'Customer behavior, retention rates, and satisfaction metrics',
        format: 'Excel',
        category: 'Analytics',
      },
    ];

    // Get recent reports from audit logs or orders (simulating generated reports)
    const recentOrdersQuery = {
      take: limit,
      skip: (page - 1) * limit,
      where: {
        orderDate: {
          gte: startDate,
        },
        ...(search && {
          OR: [
            { id: { contains: search, mode: 'insensitive' as const } },
            { Business: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }),
      },
      include: {
        Business: {
          select: { id: true, name: true },
        },
        OrderItem: {
          include: {
            Product: {
              select: { name: true, sku: true }
            }
          }
        },
      },
      orderBy: { orderDate: 'desc' as const },
    };

    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany(recentOrdersQuery),
      prisma.order.count({ where: recentOrdersQuery.where }),
    ]);

    // Convert orders to recent reports format
    const recentReports = orders.map(order => ({
      id: `report-${order.id}`,
      name: `Sales Report - ${order.Business?.name || 'Unknown'}`,
      type: 'SALES',
      description: `Sales report for order ${order.id.slice(-8)} with ${order.OrderItem.length} items`,
      lastGenerated: order.orderDate.toISOString(),
      generatedBy: 'System',
      format: 'PDF',
      size: `${Math.floor(Math.random() * 500 + 100)}KB`,
      orderId: order.id,
      businessName: order.Business?.name,
      totalAmount: order.totalAmount,
    }));

    // Get statistics
    const [totalSales, totalMerchants, totalLogistics] = await Promise.all([
      prisma.order.aggregate({
        where: { orderDate: { gte: startDate } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.business.count({ where: { isActive: true } }),
      prisma.logisticsRegion.count(),
    ]);

    const stats = {
      totalReports: totalOrders,
      totalRevenue: totalSales._sum.totalAmount || 0,
      totalMerchants,
      totalLogistics,
      generatedThisMonth: recentReports.length,
      popularFormat: 'PDF',
    };

    // Filter available reports by type if specified
    const filteredAvailable = type 
      ? availableReports.filter(report => report.type === type)
      : availableReports;

    const categories = [...new Set(availableReports.map(r => r.category))];

    return NextResponse.json({
      availableReports: filteredAvailable,
      recentReports,
      categories,
      stats,
      pagination: {
        page,
        limit,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reportType, parameters } = body;

    // Here you would implement actual report generation logic
    // For now, we'll simulate report generation
    
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const generatedReport = {
      id: reportId,
      name: `${reportType} Report`,
      type: reportType.toUpperCase(),
      description: `Generated ${reportType} report with custom parameters`,
      lastGenerated: new Date().toISOString(),
      generatedBy: session.userId,
      format: parameters.format || 'PDF',
      size: `${Math.floor(Math.random() * 1000 + 200)}KB`,
      downloadUrl: `/api/reports/${reportId}/download`,
    };

    return NextResponse.json({
      success: true,
      report: generatedReport,
      message: 'Report generated successfully',
    });

  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}