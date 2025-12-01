import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/notifications';
import { createNotification } from '@/lib/notifications';
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

    // Parse query params for pagination/filtering
    const { searchParams } = new URL(request.url);
    const productPage = parseInt(searchParams.get('productPage') || '1');
    const productLimit = parseInt(searchParams.get('productLimit') || '10');
    const orderPage = parseInt(searchParams.get('orderPage') || '1');
    const orderLimit = parseInt(searchParams.get('orderLimit') || '10');
    const invoicePage = parseInt(searchParams.get('invoicePage') || '1');
    const invoiceLimit = parseInt(searchParams.get('invoiceLimit') || '10');

    // Fetch business details with error handling
    let business, businessError = null;
    try {
      business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          baseCurrency: true,
          logoUrl: true,
          address: true,
          city: true,
          state: true,
          country: true,
          contactPhone: true,
          ownerId: true,
          name: true
        }
      });
    } catch (err) {
      businessError = (err instanceof Error ? err.message : String(err)) || 'Failed to fetch business details';
    }

    // Fetch owner info
    let owner = null;
    if (business?.ownerId) {
      try {
        owner = await prisma.user.findUnique({
          where: { id: business.ownerId },
          select: { firstName: true, lastName: true, email: true }
        });
      } catch { }
    }

    // Stats loaders with error handling
    let totalProducts = 0,
      totalOrders = 0,
      revenueData: { _sum?: { totalAmount?: number | null } } = {},
      lowStockProducts = 0,
      pendingShipments = 0,
      activeCustomers = 0,
      recentOrders: any[] = [],
      topProductsWithDetails: any[] = [],
      products: any[] = [],
      invoices: any[] = [],
      activePayments = 0,
      pendingPayments = 0,
      overduePayments = 0;
    const statsErrors: {
      totalProducts?: string;
      totalOrders?: string;
      revenueData?: string;
      lowStockProducts?: string;
      pendingShipments?: string;
      activeCustomers?: string;
      recentOrders?: string;
      growthRate?: string;
      payments?: string;
      orderStatusBreakdown?: string;
      productCategoryBreakdown?: string;
    } = {};
    try {
      totalProducts = await prisma.product.count({ where: { businessId } });
    } catch (err) { statsErrors.totalProducts = err instanceof Error ? err.message : String(err); }
    try {
      totalOrders = await prisma.order.count({ where: { merchantId: businessId } });
    } catch (err) { statsErrors.totalOrders = err instanceof Error ? err.message : String(err); }
    try {
      revenueData = await prisma.order.aggregate({
        where: {
          merchantId: businessId,
          status: 'DELIVERED',
          orderDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        },
        _sum: { totalAmount: true }
      });
    } catch (err) { statsErrors.revenueData = err instanceof Error ? err.message : String(err); }
    try {
      lowStockProducts = 0; // TODO: Implement proper stock tracking
    } catch (err) { statsErrors.lowStockProducts = err instanceof Error ? err.message : String(err); }
    try {
      pendingShipments = await prisma.order.count({ where: { merchantId: businessId, status: 'NEW' } });
    } catch (err) { statsErrors.pendingShipments = err instanceof Error ? err.message : String(err); }
    try {
      activeCustomers = await prisma.order.findMany({
        where: { merchantId: businessId },
        distinct: ['customerName'],
        select: { customerName: true }
      }).then(orders => orders.length);
    } catch (err) { statsErrors.activeCustomers = err instanceof Error ? err.message : String(err); }
    try {
      recentOrders = await prisma.order.findMany({
        where: { merchantId: businessId },
        take: orderLimit,
        skip: (orderPage - 1) * orderLimit,
        orderBy: { orderDate: 'desc' },
        include: {
          OrderItem: {
            include: { Product: { select: { name: true, weightKg: true } } }
          }
        }
      });
    } catch (err) { statsErrors.recentOrders = err instanceof Error ? err.message : String(err); }

    // Month-over-month growth
    let growthRate; // Declare growthRate without initializing
    try {
      const lastMonthRevenue: { _sum?: { totalAmount?: number | null } } = await prisma.order.aggregate({
        where: {
          merchantId: businessId,
          status: 'DELIVERED',
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { totalAmount: true }
      });
      const currentRevenue = revenueData._sum?.totalAmount || 0;
      const previousRevenue = lastMonthRevenue._sum?.totalAmount || 0;
      growthRate = previousRevenue > 0
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : 0;
    } catch (err) { statsErrors.growthRate = err instanceof Error ? err.message : String(err); }

    // Top selling products
    // let topProductsWithDetails = []; // Duplicate declaration removed
    try {
      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          Order: {
            merchantId: businessId,
            orderDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
          }
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      });
      topProductsWithDetails = await Promise.all(topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, weightKg: true }
        });
        return { ...product, totalSold: item._sum?.quantity || 0 };
      }));
    } catch { /* error intentionally ignored */ }

    // Products list with pagination
    let productsError = null;
    try {
      products = await prisma.product.findMany({
        where: { businessId },
        select: { id: true, name: true, sku: true, weightKg: true, imageUrl: true },
        take: productLimit,
        skip: (productPage - 1) * productLimit,
        orderBy: { name: 'asc' }
      });
    } catch (err) { productsError = err instanceof Error ? err.message : String(err); }

    // Invoices with pagination
    let invoicesError = null;
    try {
      invoices = await prisma.invoice.findMany({
        where: { merchantId: businessId },
        orderBy: { issueDate: 'desc' },
        take: invoiceLimit,
        skip: (invoicePage - 1) * invoiceLimit
      });
    } catch (err) { invoicesError = err instanceof Error ? err.message : String(err); }

    // Payment stats
    // let activePayments = 0, pendingPayments = 0, overduePayments = 0; // Duplicate declaration removed
    try {
      activePayments = invoices.filter(inv => inv.status === 'PAID').length;
      pendingPayments = invoices.filter(inv => inv.status === 'ISSUED').length;
      overduePayments = invoices.filter(inv => inv.status === 'OVERDUE').length;
    } catch (err) { statsErrors.payments = err instanceof Error ? err.message : String(err); }

    // Additional analytics: orders by status, products by category
    let orderStatusBreakdown = {}, productCategoryBreakdown = {};
    try {
      const orderStatusCounts = await prisma.order.groupBy({
        by: ['status'],
        where: { merchantId: businessId },
        _count: { status: true }
      });
      orderStatusBreakdown = Object.fromEntries(orderStatusCounts.map(o => [o.status, o._count.status]));
    } catch (err) { statsErrors.orderStatusBreakdown = err instanceof Error ? err.message : String(err); }
    try {
      // Product model does not have a 'category' field. Remove category breakdown or use a valid field.
      productCategoryBreakdown = {};
    } catch (err) { statsErrors.productCategoryBreakdown = err instanceof Error ? err.message : String(err); }

    // Hooks: notifications/audit logs/side effects
    try {
      await createAuditLog(session.userId, 'Business', businessId, 'DASHBOARD_VIEWED', { timestamp: new Date().toISOString() });
      await createNotification(
        session.userId,
        'Dashboard viewed',
        null,
        'EMAIL_VERIFICATION',
        { title: 'Dashboard Access', createdAt: new Date() }
      );
    } catch { }

    // Compose response
    // Duplicate dashboardData declaration removed

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
      _sum: { totalAmount: true }
    });

    const currentRevenue = revenueData._sum?.totalAmount || 0;
    const previousRevenue = lastMonthRevenue._sum?.totalAmount || 0;
    growthRate = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    // Get top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        Order: {
          merchantId: businessId,
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    // Fetch merchant's products
    products = await prisma.product.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        sku: true,
        weightKg: true,
        imageUrl: true
      },
      take: 10,
      orderBy: { name: 'asc' }
    });

    // Fetch merchant's invoices (payments)
    invoices = await prisma.invoice.findMany({
      where: { merchantId: businessId },
      orderBy: { issueDate: 'desc' },
      take: 10
    });

    // Calculate payment stats
    activePayments = invoices.filter(inv => inv.status === 'PAID').length;
    pendingPayments = invoices.filter(inv => inv.status === 'ISSUED').length;
    overduePayments = invoices.filter(inv => inv.status === 'OVERDUE').length;

    topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, weightKg: true }
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
      currency: business?.baseCurrency || 'USD',
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        status: order.status,
        itemCount: order.OrderItem?.length || 0,
        orderDate: order.orderDate,
        items: order.OrderItem?.map((oi: any) => ({
          name: oi.Product?.name,
          weightKg: oi.Product?.weightKg,
          quantity: oi.quantity
        })) || []
      })),
      topProducts: topProductsWithDetails,
      products,
      payments: {
        invoices,
        activePayments,
        pendingPayments,
        overduePayments
      }
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
