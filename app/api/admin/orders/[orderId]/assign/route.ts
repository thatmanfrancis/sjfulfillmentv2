import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { logisticsId } = await _req.json();
    if (!logisticsId) {
      return Response.json({ error: 'Missing logisticsId' }, { status: 400 });
    }
    const { orderId } = await ctx.params;
    if (!orderId) {
      return Response.json({ error: 'Missing orderId param' }, { status: 400 });
    }
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedLogisticsId: logisticsId,
        status: 'PICKED_UP',
      },
    });

    // Create a shipment if it doesn't exist for this order
    const existingShipment = await prisma.shipment.findUnique({ where: { orderId } });
    if (!existingShipment) {
      await prisma.shipment.create({
        data: {
          id: (globalThis.crypto ?? require('crypto')).randomUUID(),
          Order: { connect: { id: orderId } },
          lastStatusUpdate: new Date(),
        },
      });
    }

    return Response.json({ success: true, order: updated });
  } catch (error) {
    console.error('Assign logistics error:', error);
    return Response.json({ error: 'Failed to assign logistics' }, { status: 500 });
  }
}
