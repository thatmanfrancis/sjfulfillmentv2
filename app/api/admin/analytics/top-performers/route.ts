import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [topBusinesses, topProducts, topCustomers] = await Promise.all([
      // Top businesses by revenue
      prisma.business.findMany({
        include: {
          Order: {
            select: { totalAmount: true }
          },
          _count: { select: { Order: true } }
        },
        take: 10
      }),
      
      // Top products by order count
      prisma.product.findMany({
        include: {
          OrderItem: {
            select: { quantity: true }
          },
          _count: { select: { OrderItem: true } }
        },
        take: 10
      }),
      
      // Top customers by order value
      prisma.user.findMany({
        where: { role: 'MERCHANT' },
        include: {
          Order: {
            select: { totalAmount: true }
          },
          _count: { select: { Order: true } }
        },
        take: 10
      })
    ]);

    const transformedBusinesses = topBusinesses
      .map((business: any) => ({
        id: business.id,
        name: business.name,
                totalRevenue: business.Order.reduce((sum: any, order: any) => 
          sum + order.totalAmount, 0),
        orderCount: business._count.Order
      }))
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const transformedProducts = topProducts
      .map((product: any) => ({
        id: product.id,
        name: product.name,
        totalSold: product.OrderItem?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        totalRevenue: product.OrderItem?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0,
        orderCount: product._count.OrderItem
      }))
      .sort((a: any, b: any) => b.totalSold - a.totalSold)
      .slice(0, 10);

    const transformedCustomers = topCustomers
      .map((customer: any) => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        totalSpent: customer.Order?.reduce((sum: number, order: any) => sum + order.totalAmount, 0) || 0,
        orderCount: customer._count.Order
      }))
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      topPerformers: {
        businesses: transformedBusinesses,
        products: transformedProducts,
        customers: transformedCustomers
      }
    });

  } catch (error) {
    console.error('Error fetching top performers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}