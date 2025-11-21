import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

// GET endpoint to list soft-deleted merchants for data harvesting
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause for deleted merchants
    const where: any = {
      deletedAt: { not: null }, // Only soft-deleted merchants
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get soft-deleted merchants with their data for harvesting
    const [deletedMerchants, totalCount] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          Order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              orderDate: true,
              customerName: true,
              customerAddress: true,
            },
          },
              Product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  weightKg: true,
                },
              },
              Invoice: {
                select: {
                  id: true,
                  totalDue: true,
                  status: true,
                  issueDate: true,
                },
              },
          _count: {
            select: {
              Order: true,
              Product: true,
              Invoice: true,
            },
          },
        },
        orderBy: { deletedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    // Fetch staff for each merchant
    const merchantStaffMap: Record<string, { id: string; firstName: string; lastName: string; email: string; role: string; createdAt: Date; lastLoginAt: Date | null; }[]> = {};
    for (const merchant of deletedMerchants) {
      merchantStaffMap[merchant.id] = await prisma.user.findMany({
        where: {
          businessId: merchant.id,
          role: 'MERCHANT',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });
    }

    // Transform data for data harvesting
    const harvestData = deletedMerchants.map(merchant => ({
      // Basic merchant info
      id: merchant.id,
      name: merchant.name,
      contactPhone: merchant.contactPhone,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      country: merchant.country,
      logoUrl: merchant.logoUrl,
      baseCurrency: merchant.baseCurrency,
      onboardingStatus: merchant.onboardingStatus,
      
      // Timestamps
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
      deletedAt: merchant.deletedAt,
      
      // Staff data
      staffCount: merchantStaffMap[merchant.id].length,
      staff: merchantStaffMap[merchant.id],
      
      // Order data
      orderCount: merchant._count.Order,
      totalOrderValue: merchant.Order.reduce((sum, order) => sum + order.totalAmount, 0),
      orderHistory: merchant.Order,
      
      // Product data
      productCount: merchant._count.Product,
       products: merchant.Product,
      
      // Invoice data
      invoiceCount: merchant._count.Invoice,
       totalInvoiceValue: merchant.Invoice.reduce((sum, invoice) => sum + invoice.totalDue, 0),
       invoices: merchant.Invoice,
      
      // Business metrics
      avgOrderValue: merchant._count.Order > 0 
        ? merchant.Order.reduce((sum, order) => sum + order.totalAmount, 0) / merchant._count.Order 
        : 0,
      businessDuration: merchant.deletedAt && merchant.createdAt
        ? Math.floor((new Date(merchant.deletedAt).getTime() - new Date(merchant.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return NextResponse.json({
      merchants: harvestData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalDeletedMerchants: totalCount,
        totalDeletedOrderValue: harvestData.reduce((sum, m) => sum + m.totalOrderValue, 0),
        totalDeletedInvoiceValue: harvestData.reduce((sum, m) => sum + m.totalInvoiceValue, 0),
        avgBusinessDuration: harvestData.length > 0 
          ? harvestData.reduce((sum, m) => sum + m.businessDuration, 0) / harvestData.length 
          : 0,
      },
    });

  } catch (error) {
    console.error('Failed to fetch deleted merchants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}