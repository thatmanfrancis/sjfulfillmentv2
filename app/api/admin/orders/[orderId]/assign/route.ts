import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const body = await _req.json();
    const { logisticsId, warehousePicks } = body;
    if (!logisticsId) {
      return Response.json({ error: 'Missing logisticsId' }, { status: 400 });
    }
    const { orderId } = await ctx.params;
    if (!orderId) {
      return Response.json({ error: 'Missing orderId param' }, { status: 400 });
    }

    // Validate warehousePicks: [{ productId, picks: [{ warehouseId, quantity }] }]
    if (!Array.isArray(warehousePicks)) {
      return Response.json({ error: 'Missing or invalid warehousePicks' }, { status: 400 });
    }

    // Fetch order and items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: true
      }
    });
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate picks for each item
    for (const item of order.OrderItem) {
      const pick = warehousePicks.find((wp: any) => wp.productId === item.productId);
      if (!pick) {
        return Response.json({ error: `Missing warehouse picks for product ${item.productId}` }, { status: 400 });
      }
      const totalPicked = (pick.picks || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
      if (totalPicked !== item.quantity) {
        return Response.json({ error: `Total picked for product ${item.productId} does not match order quantity` }, { status: 400 });
      }
      // Validate stock for each warehouse
      for (const p of pick.picks || []) {
        const alloc = await prisma.stockAllocation.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: p.warehouseId
            }
          }
        });
        if (!alloc || alloc.allocatedQuantity < p.quantity) {
          return Response.json({ error: `Insufficient stock for product ${item.productId} in warehouse ${p.warehouseId}` }, { status: 400 });
        }
      }
    }

    // Decrement stock allocations
    for (const item of order.OrderItem) {
      const pick = warehousePicks.find((wp: any) => wp.productId === item.productId);
      for (const p of pick.picks || []) {
        await prisma.stockAllocation.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: p.warehouseId
            }
          },
          data: {
            allocatedQuantity: {
              decrement: p.quantity
            }
          }
        });
      }
    }

    // Assign logistics and update status
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
