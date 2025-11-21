import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { sendNotificationToMerchant } from '@/lib/notifications';

// PATCH /api/logistics/shipments/[shipmentId]/status
export async function PATCH(_req: NextRequest, context: { params: Promise<{ shipmentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'LOGISTICS') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { status } = await _req.json();
    if (!status) {
      return Response.json({ error: 'Missing status' }, { status: 400 });
    }
    // Only allow valid OrderStatus enum values
    const validStatuses = [
      'NEW', 'AWAITING_ALLOC', 'DISPATCHED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'RETURNED', 'CANCELED', 'ON_HOLD'
    ];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status value' }, { status: 400 });
    }
    const { shipmentId } = await context.params;
    if (!shipmentId) {
      return Response.json({ error: 'Missing shipmentId param' }, { status: 400 });
    }
    // Find the shipment and its order
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { Order: { include: { Business: true } } },
    });
    if (!shipment || !shipment.Order) {
      return Response.json({ error: 'Shipment or order not found' }, { status: 404 });
    }
    // Only allow logistics assigned to this order to update
    if (shipment.Order.assignedLogisticsId !== session.userId) {
      return Response.json({ error: 'Not assigned to you' }, { status: 403 });
    }
    // Update shipment status (lastStatusUpdate)
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { lastStatusUpdate: new Date() },
    });
    // Always update order status to match
    const order = await prisma.order.update({
      where: { id: shipment.Order.id },
      data: { status },
      include: { Business: true },
    });
    // Notify merchant
    await sendNotificationToMerchant(order.merchantId, {
      title: `Order #${order.id} status updated`,
      message: `The status of your order is now: ${status}`,
      linkUrl: `/merchant/orders/${order.id}`
    });
    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Error updating shipment status:', error);
    return Response.json({ error: 'Failed to update shipment status' }, { status: 500 });
  }
}
