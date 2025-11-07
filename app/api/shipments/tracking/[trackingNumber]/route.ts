import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while tracking shipment` },
      { status: 400 }
    );
  }

  try {
    const { trackingNumber } = await params;
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: trackingNumber },
      include: {
        order: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            shippingAddress: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: "desc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("Track shipment error:", error);
    return NextResponse.json(
      { error: "Failed to track shipment" },
      { status: 500 }
    );
  }
}
