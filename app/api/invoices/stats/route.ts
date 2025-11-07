import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching invoice statistics` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    const [
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      draftInvoices,
      totalRevenue,
      totalOutstanding,
    ] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: "PAID" } }),
      prisma.invoice.count({
        where: {
          ...where,
          status: "OVERDUE",
        },
      }),
      prisma.invoice.count({ where: { ...where, status: "DRAFT" } }),
      prisma.invoice.aggregate({
        where: { ...where, status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...where,
          status: { in: ["SENT", "VIEWED", "OVERDUE"] },
        },
        _sum: { amountDue: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        draftInvoices,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalOutstanding: totalOutstanding._sum.amountDue || 0,
      },
    });
  } catch (error) {
    console.error("Get invoice stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice statistics" },
      { status: 500 }
    );
  }
}
