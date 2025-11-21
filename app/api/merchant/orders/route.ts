import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/merchant/orders?status=&search=
export async function GET(req: NextRequest) {
  const session = await verifyAuth(req);
  if (!session.success || !session.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const where: any = {
    merchantId: session.user.businessId,
  };
  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { externalOrderId: { contains: search } },
      { customerName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { orderDate: 'desc' },
    include: {
      OrderItem: {
        include: { Product: true },
      },
    },
  });

  // Map to frontend shape
  const mapped = orders.map((order) => ({
    id: order.id,
    externalOrderId: order.externalOrderId,
    customerName: order.customerName,
    status: order.status,
    totalAmount: order.totalAmount,
    orderDate: order.orderDate,
    items: order.OrderItem?.map((item: any) => ({
      id: item.id,
      productName: item.Product?.name || '',
      quantity: item.quantity,
      price: item.price,
    })) || [],
  }));

  return NextResponse.json(mapped);
}
