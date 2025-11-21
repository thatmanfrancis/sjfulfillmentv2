import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { shipmentId } = await context.params;
    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId param' }, { status: 400 });
    }
    // Find the shipment and its order
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { Order: true },
    });
    if (!shipment || !shipment.Order) {
      return NextResponse.json({ error: 'Shipment or order not found' }, { status: 404 });
    }
    // Remove logistics assignment from the order
    const updatedOrder = await prisma.order.update({
      where: { id: shipment.Order.id },
      data: { assignedLogisticsId: null },
    });
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Remove logistics error:', error);
    return NextResponse.json({ error: 'Failed to remove logistics' }, { status: 500 });
  }
}
