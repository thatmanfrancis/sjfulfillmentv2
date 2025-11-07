import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching payments` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
          invoice: {
            select: {
              invoiceNumber: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

///api/payments/route.ts - Create Payment
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating payment` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      invoiceId,
      orderId,
      customerId,
      currencyId,
      paymentMethod,
      amount,
      paymentReference,
      gatewayResponse,
    } = body;

    if (!merchantId || !customerId || !currencyId || !amount) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        merchantId,
        invoiceId,
        orderId,
        customerId,
        currencyId,
        paymentMethod: paymentMethod || "OTHER",
        amount,
        paymentReference,
        gatewayResponse,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        message: "Payment created successfully",
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
