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

    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [invoices, totalInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          Business: { select: { name: true } }
        },
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    const transformedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      merchantId: invoice.merchantId,
      merchantName: invoice.Business?.name || 'Unknown',
      billingPeriod: invoice.billingPeriod,
      amount: 0, // Calculate based on your business logic
      status: invoice.status || 'PENDING',
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paymentDate: invoice.paymentDate?.toISOString(),
      createdAt: invoice.issueDate.toISOString()
    }));

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      pagination: {
        page,
        limit,
        total: totalInvoices,
        pages: Math.ceil(totalInvoices / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}