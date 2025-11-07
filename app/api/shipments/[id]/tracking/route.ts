import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while tracking shipment` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const trackingEvents = await prisma.shipmentTrackingEvent.findMany({
      where: { shipmentId: id },
      orderBy: { eventTime: "desc" },
    });

    return NextResponse.json({ trackingEvents });
  } catch (error) {
    console.error("Get tracking events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking events" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while tracking shipment` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, location, description, eventTime } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const trackingEvent = await prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId: id,
        status,
        location,
        description,
        eventTime: eventTime ? new Date(eventTime) : new Date(),
      },
    });

    // Update shipment status
    await prisma.shipment.update({
      where: { id: id },
      data: { status },
    });

    return NextResponse.json({
      message: "Tracking event added successfully",
      trackingEvent,
    });
  } catch (error) {
    console.error("Add tracking event error:", error);
    return NextResponse.json(
      { error: "Failed to add tracking event" },
      { status: 500 }
    );
  }
}
