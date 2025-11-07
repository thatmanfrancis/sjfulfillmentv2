import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching order lists` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const fulfillmentStatus = searchParams.get("fulfillmentStatus");
    const search = searchParams.get("search");
    const merchantId = searchParams.get("merchantId");
    const customerId = searchParams.get("customerId");
    const assignedTo = searchParams.get("assignedTo");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      deletedAt: null,
    };

    // Role-based filtering
    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      // Check if user is logistics personnel
      const isLogistics = userRole === "LOGISTICS_PERSONNEL";

      if (isLogistics) {
        // Logistics sees assigned orders
        where.OR = [
          { assignedTo: auth.userId as string },
          { merchantId: { in: merchantIds } },
        ];
      } else {
        // Merchants see their own orders
        if (merchantIds.length === 0) {
          // User has no merchant access, return empty results
          return NextResponse.json({
            orders: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          });
        }
        where.merchantId = { in: merchantIds };
      }
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      where.paymentStatus = paymentStatus;
    }

    if (fulfillmentStatus && fulfillmentStatus !== "all") {
      where.fulfillmentStatus = fulfillmentStatus;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { externalOrderId: { contains: search, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          merchant: {
            select: {
              id: true,
              businessName: true,
            },
          },
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching user authentication` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      customerId,
      externalOrderId,
      integrationId,
      channel,
      shippingAddressId,
      billingAddressId,
      currencyId,
      items,
      shippingCost,
      discountAmount,
      taxAmount,
      notes,
      internalNotes,
      tags,
      priority,
      warehouseId,
      expectedShipDate,
      customFields,
    } = body;

    if (
      !merchantId ||
      !customerId ||
      !shippingAddressId ||
      !billingAddressId ||
      !currencyId
    ) {
      return NextResponse.json(
        { error: "Merchant, customer, addresses, and currency are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one order item is required" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { merchantId },
    });
    const orderNumber = `ORD-${merchantId.slice(0, 8).toUpperCase()}-${String(
      orderCount + 1
    ).padStart(6, "0")}`;

    // Calculate totals
    let subtotal = 0;
    items.forEach((item: any) => {
      subtotal += item.unitPrice * item.quantity;
    });

    const totalAmount =
      subtotal + (shippingCost || 0) + (taxAmount || 0) - (discountAmount || 0);

    // Create order
    const order = await prisma.order.create({
      data: {
        merchantId,
        customerId,
        orderNumber,
        externalOrderId,
        integrationId,
        channel,
        shippingAddressId,
        billingAddressId,
        currencyId,
        subtotal,
        taxAmount: taxAmount || 0,
        shippingCost: shippingCost || 0,
        discountAmount: discountAmount || 0,
        totalAmount,
        notes,
        internalNotes,
        tags,
        priority: priority || "NORMAL",
        warehouseId,
        expectedShipDate,
        customFields,
        status: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxAmount: item.taxAmount || 0,
            discountAmount: item.discountAmount || 0,
            totalPrice: item.unitPrice * item.quantity,
            status: "PENDING",
          })),
        },
      },
      include: {
        customer: true,
        items: true,
        currency: true,
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: "PENDING",
        changedBy: auth.userId as string,
        notes: "Order created",
      },
    });

    // Update customer order count
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        orderCount: { increment: 1 },
      },
    });

    return NextResponse.json(
      {
        message: "Order created successfully",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}