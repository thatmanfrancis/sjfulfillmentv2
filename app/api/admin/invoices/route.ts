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
      totalDue: invoice.totalDue,
      status: invoice.status || 'PENDING',
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paymentDate: invoice.paymentDate?.toISOString(),
      createdAt: invoice.issueDate.toISOString(),
      amountPaid: invoice.amountPaid,
      fulfillmentFees: invoice.fulfillmentFees,
      storageCharges: invoice.storageCharges,
      receivingFees: invoice.receivingFees,
      otherFees: invoice.otherFees,
      Business: invoice.Business,
      currency: invoice.currency || 'NGN',
      orderId: invoice.orderId,
      priceTierBreakdown: Array.isArray(invoice.priceTierBreakdown)
        ? invoice.priceTierBreakdown.map((item: any) => ({
            sku: item.sku || '',
            productName: item.productName || '',
            amount: item.amount,
            quantity: item.quantity
          }))
        : invoice.priceTierBreakdown
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

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only admin can generate invoices
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { merchantId, billingPeriod, orderIds } = await request.json();
    if (!merchantId || !billingPeriod || !orderIds || !Array.isArray(orderIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Fetch orders
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, merchantId },
      include: {
        OrderItem: { include: { Product: true } },
        Shipment: true,
      },
    });
    // Fetch price tiers
    const priceTiers = await prisma.pricingTier.findMany({ where: { merchantId } });
    // Calculate fees (mock logic, replace with real)
    let totalDue = 0;
    let fulfillmentFees = 0;
    let storageCharges = 0;
    let receivingFees = 0;
    let otherFees = 0;
    // Collect price tier group and breakdowns from orders
    const orderIdsForInvoice = orders.map(order => order.id);
    const priceTierGroupIds = orders.map(order => order.priceTierGroupId).filter(Boolean);
    const priceTierBreakdowns = orders.map(order => order.priceTierBreakdown).filter(Boolean);
    orders.forEach(order => {
      totalDue += order.totalAmount;
      fulfillmentFees += 100; // Example
      storageCharges += 50; // Example
    });
    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        id: crypto.randomUUID(),
        merchantId,
        billingPeriod,
        totalDue,
        fulfillmentFees,
        storageCharges,
        receivingFees,
        otherFees,
        dueDate: new Date(),
        status: "ISSUED",
        orderId: orderIdsForInvoice[0] ?? undefined,
        priceTierGroupId: priceTierGroupIds[0] ?? undefined,
        priceTierBreakdown: priceTierBreakdowns[0] ?? undefined,
      },
    });
    return NextResponse.json({ success: true, invoice, orders, priceTiers, orderIds: orderIdsForInvoice, priceTierGroupIds, priceTierBreakdowns });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only admin can update invoice status
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { invoiceId, status } = await request.json();
    if (!invoiceId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Fetch invoice to get totalDue if needed
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paymentDate: status === "PAID" ? new Date() : null,
        amountPaid: status === "PAID" ? invoice.totalDue : 0
      }
    });
    return NextResponse.json({ success: true, invoice: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}