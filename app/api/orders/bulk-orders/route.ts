import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { orders } = body;

    if (!Array.isArray(orders)) {
      return NextResponse.json(
        { error: "Orders array is required" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const orderData of orders) {
      try {
        // Generate order number
        const orderCount = await prisma.order.count({
          where: { merchantId: orderData.merchantId },
        });
        const orderNumber = `ORD-${orderData.merchantId
          .slice(0, 8)
          .toUpperCase()}-${String(orderCount + 1).padStart(6, "0")}`;

        await prisma.order.create({
          data: {
            ...orderData,
            orderNumber,
            status: "PENDING",
            paymentStatus: "PENDING",
            fulfillmentStatus: "UNFULFILLED",
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          order: orderData.externalOrderId || "unknown",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Bulk import completed. ${results.success} succeeded, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error("Bulk import orders error:", error);
    return NextResponse.json(
      { error: "Failed to import orders" },
      { status: 500 }
    );
  }
}
