import { createOrderPDF } from '@/lib/pdf/orders';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from "@/lib/prisma";

// POST /api/merchant/orders/export
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session || !session.user || !session.user.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { dateFrom, dateTo } = await req.json();
    const businessId = session.user.businessId;
    const where: any = { merchantId: businessId };
    if (dateFrom) where.orderDate = { gte: new Date(dateFrom) };
    if (dateTo) {
      where.orderDate = where.orderDate || {};
      where.orderDate.lte = new Date(dateTo);
    }
    const orders = await prisma.order.findMany({
      where,
      include: {
        OrderItem: { include: { Product: true } },
        Business: true,
        Warehouse: true,
      },
      orderBy: { orderDate: 'desc' },
    });
    const pdfBuffer = await createOrderPDF(orders, { businessName: session.user.businessName });
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="orders_report.pdf"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to export orders' }, { status: 500 });
  }
}
