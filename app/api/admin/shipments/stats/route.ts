import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Based on actual Shipment schema: id, orderId, trackingNumber, carrierName, labelUrl, deliveryAttempts, lastStatusUpdate
    const [
      totalShipments,
      shipmentsByCarrier,
      multipleAttempts,
      recentShipments
    ] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.groupBy({
        by: ['carrierName'],
        _count: true,
        where: {
          carrierName: { not: null }
        }
      }),
      prisma.shipment.count({
        where: {
          deliveryAttempts: { gt: 1 }
        }
      }),
      prisma.shipment.findMany({
        take: 5,
        include: {
          Order: {
            select: {
              customerName: true,
              Business: { select: { name: true } }
            }
          }
        },
        orderBy: { lastStatusUpdate: 'desc' }
      })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalShipments,
        multipleAttempts,
        shipmentsByCarrier: shipmentsByCarrier.map(group => ({
          carrier: group.carrierName,
          count: group._count
        })),
        recentShipments: recentShipments.map(shipment => ({
          id: shipment.id,
          trackingNumber: shipment.trackingNumber,
          customer: shipment.Order.customerName,
          merchant: shipment.Order.Business.name,
          carrier: shipment.carrierName,
          deliveryAttempts: shipment.deliveryAttempts,
          lastUpdate: shipment.lastStatusUpdate
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching shipment stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}