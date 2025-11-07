import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching sales report` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      paymentStatus: "PAID",
    };

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (startDate) {
      where.orderDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.orderDate = { ...where.orderDate, lte: new Date(endDate) };
    }

    const [totalSales, orderCount, averageOrderValue, salesByDay] =
      await Promise.all([
        prisma.order.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        prisma.order.count({ where }),
        prisma.order.aggregate({
          where,
          _avg: { totalAmount: true },
        }),
        prisma.$queryRaw`
          SELECT DATE(order_date) as date, COUNT(*) as orders, SUM(total_amount) as revenue
          FROM orders
          WHERE payment_status = 'PAID'
          ${merchantId ? prisma.$queryRawUnsafe(`AND merchant_id = '${merchantId}'`) : prisma.$queryRawUnsafe('')}
          GROUP BY DATE(order_date)
          ORDER BY date DESC
          LIMIT 30
        `,
      ]);

    return NextResponse.json({
      report: {
        totalSales: totalSales._sum.totalAmount || 0,
        orderCount,
        averageOrderValue: averageOrderValue._avg.totalAmount || 0,
        salesByDay,
      },
    });
  } catch (error) {
    console.error("Get sales report error:", error);
    return NextResponse.json(
      { error: "Failed to generate sales report" },
      { status: 500 }
    );
  }
}