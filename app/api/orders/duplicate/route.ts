import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching user authentication` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { orderId } = body;

    const original = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Generate new order number
    const orderCount = await prisma.order.count({
      where: { merchantId: original.merchantId },
    });
    const orderNumber = `ORD-${original.merchantId
      .slice(0, 8)
      .toUpperCase()}-${String(orderCount + 1).padStart(6, "0")}`;

    // Duplicate order
    const duplicate = await prisma.order.create({
      data: {
        merchantId: original.merchantId,
        customerId: original.customerId,
        orderNumber,
        channel: original.channel,
        shippingAddressId: original.shippingAddressId,
        billingAddressId: original.billingAddressId,
        currencyId: original.currencyId,
        subtotal: original.subtotal,
        taxAmount: original.taxAmount,
        shippingCost: original.shippingCost,
        discountAmount: original.discountAmount,
        totalAmount: original.totalAmount,
        notes: original.notes,
        tags: original.tags || [],
        priority: original.priority,
        status: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        items: {
          create: original.items.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
            totalPrice: item.totalPrice,
            status: "PENDING",
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      message: "Order duplicated successfully",
      order: duplicate,
    });
  } catch (error) {
    console.error("Duplicate order error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate order" },
      { status: 500 }
    );
  }
}
