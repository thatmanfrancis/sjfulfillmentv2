import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const merchantId = searchParams.get("merchantId");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// app/api/invoices/route.ts - Create Invoice
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      orderId,
      customerId,
      billingAddressId,
      currencyId,
      invoiceType,
      items,
      dueDate,
      paymentTerms,
      notes,
      termsAndConditions,
    } = body;

    if (!merchantId || !customerId || !billingAddressId || !currencyId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count({
      where: { merchantId },
    });
    const invoiceNumber = `INV-${merchantId.slice(0, 8).toUpperCase()}-${String(
      invoiceCount + 1
    ).padStart(6, "0")}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    items.forEach((item: any) => {
      subtotal += item.unitPrice * item.quantity;
      taxAmount += item.taxAmount || 0;
      discountAmount += item.discountAmount || 0;
    });

    const totalAmount = subtotal + taxAmount - discountAmount;
    const amountDue = totalAmount;

    const invoice = await prisma.invoice.create({
      data: {
        merchantId,
        orderId,
        invoiceNumber,
        invoiceType: invoiceType || "ORDER",
        customerId,
        billingAddressId,
        currencyId,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        amountDue,
        dueDate: dueDate
          ? new Date(dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: paymentTerms || "NET_30",
        notes,
        termsAndConditions,
        status: "DRAFT",
        createdBy: auth.userId as string,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
