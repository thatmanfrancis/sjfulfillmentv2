import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { sendNotificationToMerchant } from '@/lib/notifications';

export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
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
    const { orderId } = await ctx.params;
    if (!orderId) {
      return Response.json({ error: 'Missing orderId param' }, { status: 400 });
    }
    // Try to find order by id or trackingNumber, but only if defined
    let orderRecord = null;
    if (orderId && orderId.length > 8) {
      orderRecord = await prisma.order.findUnique({
        where: { id: orderId },
        include: { Business: true },
      });
    }
    if (!orderRecord && orderId) {
      orderRecord = await prisma.order.findUnique({
        where: { trackingNumber: orderId },
        include: { Business: true },
      });
    }
    if (!orderRecord || orderRecord.assignedLogisticsId !== session.userId) {
      return Response.json({ error: 'Order not found or not assigned to you' }, { status: 404 });
    }
    // Update order status
    const order = await prisma.order.update({
      where: orderRecord.id ? { id: orderRecord.id } : { trackingNumber: orderId },
      data: { status },
      include: { Business: true }
    });
    // Update shipment status if needed
    await prisma.shipment.updateMany({
      where: { orderId: order.id },
      data: { lastStatusUpdate: new Date() }
    });
    // Notify merchant
    await sendNotificationToMerchant(order.merchantId, {
      title: `Order #${order.id} status updated`,
      message: `The status of your order is now: ${status}`,
      linkUrl: `/merchant/orders/${order.id}`
    });
    return Response.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return Response.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
