import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is currently disabled due to schema limitations:
    // 1. Shipment model doesn't have shippingCost field for cost aggregation
    // 2. Shipment model doesn't have actualDelivery field for delivery time calculation
    // 3. Shipment status values may not match expected enum values
    
    return NextResponse.json({ 
      error: 'Shipment stats not available - schema limitations',
      details: {
        message: 'Shipment model requires schema update to support cost and delivery time fields',
        missingFields: ['shippingCost', 'actualDelivery'],
        availableFields: ['id', 'orderId', 'status', 'trackingNumber', 'carrierName', 'labelUrl', 'deliveryAttempts', 'deliveredAt', 'createdAt', 'lastStatusUpdate']
      },
      stats: {
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        delayed: 0,
        cancelled: 0,
        totalCost: 0,
        averageDeliveryTime: 0
      }
    }, { status: 501 });
  } catch (error) {
    console.error('Shipment stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}