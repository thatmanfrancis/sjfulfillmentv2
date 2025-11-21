import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

// PATCH: Update shipment details (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { shipmentId, trackingNumber, carrierName } = body;
    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 });
    }
    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        trackingNumber,
        carrierName
      }
    });
    return NextResponse.json({ success: true, shipment: updated });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
