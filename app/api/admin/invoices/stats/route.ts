import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'DRAFT' } }),
      prisma.invoice.count({ 
        where: { 
          dueDate: { lt: new Date() },
          status: { not: 'PAID' }
        } 
      }),
      prisma.invoice.aggregate({ _sum: { totalDue: true } })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        // totalRevenue: totalRevenue._sum?.totalAmount || 0,
        totalRevenue: totalRevenue._sum?.totalDue,
        paymentRate: totalInvoices > 0 ? (paidInvoices / totalInvoices * 100).toFixed(1) : "0"
      }
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}