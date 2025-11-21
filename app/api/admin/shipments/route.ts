import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    // Enhanced search: by customer name, tracking number, or orderId
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { Order: { customerName: { contains: search, mode: 'insensitive' } } },
        { Order: { id: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [shipments, totalShipments] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          Order: {
            include: {
              Business: { select: { name: true } },
              User: { select: { firstName: true, lastName: true, email: true, id: true } },
              OrderItem: {
                include: {
                  Product: { select: { name: true, sku: true } }
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { lastStatusUpdate: 'desc' }
      }),
      prisma.shipment.count({ where })
    ]);

    const transformedShipments = shipments.map((shipment: any) => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      carrierName: shipment.carrierName,
      labelUrl: shipment.labelUrl,
      deliveryAttempts: shipment.deliveryAttempts,
      lastStatusUpdate: shipment.lastStatusUpdate?.toISOString(),
      order: {
        id: shipment.Order?.id,
        business: shipment.Order?.Business?.name,
        customerName: shipment.Order?.customerName,
        customerAddress: shipment.Order?.customerAddress,
        customerPhone: shipment.Order?.customerPhone,
        status: shipment.Order?.status,
        totalAmount: shipment.Order?.totalAmount,
        items: shipment.Order?.OrderItem?.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          product: item.Product ? { name: item.Product.name, sku: item.Product.sku } : null
        })) || [],
        logistics: shipment.Order?.User
          ? {
              id: shipment.Order.User.id,
              name: `${shipment.Order.User.firstName || ''} ${shipment.Order.User.lastName || ''}`.trim(),
              email: shipment.Order.User.email
            }
          : null
      }
    }));

    return NextResponse.json({
      success: true,
      shipments: transformedShipments,
      pagination: {
        page,
        limit,
        total: totalShipments,
        pages: Math.ceil(totalShipments / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}