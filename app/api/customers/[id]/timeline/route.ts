import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching customer timeline` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get recent orders
    const orders = await prisma.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Get recent payments
    const payments = await prisma.payment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    // Get recent invoices
    const invoices = await prisma.invoice.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Combine and sort by date
    const timeline = [
      ...orders.map((o) => ({ type: "order", data: o, date: o.createdAt })),
      ...payments.map((p) => ({ type: "payment", data: p, date: p.createdAt })),
      ...invoices.map((i) => ({ type: "invoice", data: i, date: i.createdAt })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json({ timeline: timeline.slice(0, limit) });
  } catch (error) {
    console.error("Get customer timeline error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer timeline" },
      { status: 500 }
    );
  }
}
