import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(
  req: NextRequest,
   context: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await context.params;
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Find shipment by tracking number
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        order: {
          include: {
            merchant: true,
            customer: true,
            shippingAddress: true
          }
        },
        trackingEvents: {
          orderBy: { eventTime: "desc" }
        }
      }
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Check access permissions
    if (!isAdmin && !merchantIds.includes(shipment.order.merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      serviceLevel: shipment.serviceLevel,
      estimatedDelivery: shipment.estimatedDeliveryDate,
      actualDelivery: shipment.actualDeliveryDate,
      order: {
        orderNumber: shipment.order.orderNumber,
        customer: `${shipment.order.customer.firstName} ${shipment.order.customer.lastName}`,
        shippingAddress: shipment.order.shippingAddress
      },
      events: shipment.trackingEvents.map(event => ({
        status: event.status,
        description: event.description,
        location: event.location,
        timestamp: event.eventTime
      }))
    });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, location, description } = await req.json();

    // Find shipment
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber },
      include: { order: true }
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Create tracking event
    await prisma.$transaction(async (tx) => {
      // Add tracking event
      await tx.shipmentTrackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status,
          location,
          description,
          eventTime: new Date()
        }
      });

      // Update shipment status
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { status }
      });

      // Update order status if delivered
      if (status === "DELIVERED") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: "DELIVERED" }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            oldStatus: shipment.order.status,
            newStatus: "DELIVERED",
            changedBy: auth.userId as string,
            notes: "Order delivered via tracking update"
          }
        });
      }
    });

    return NextResponse.json({
      message: "Tracking event added successfully"
    });
  } catch (error) {
    console.error("Error updating tracking:", error);
    return NextResponse.json(
      { error: "Failed to update tracking information" },
      { status: 500 }
    );
  }
}