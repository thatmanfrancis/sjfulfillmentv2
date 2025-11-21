import type { NextRequest } from 'next/server';
import { createOrderPDF } from '@/lib/pdf/orders';
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyAuth(_req);
    if (!session || !session.user || !session.user.businessId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const businessId = session.user.businessId;
    const order = await prisma.order.findFirst({
      where: { id, merchantId: businessId },
      include: {
        OrderItem: { include: { Product: true } },
        Business: true,
        Warehouse: true,
      },
    });
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    const pdfBuffer = await createOrderPDF([order], {
      businessName: session.user.businessName,
    });
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=order_${order.id}.pdf`,
      },
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || `Failed to export order: ${error?.stack}` },
      { status: 500 }
    );
  }
}
