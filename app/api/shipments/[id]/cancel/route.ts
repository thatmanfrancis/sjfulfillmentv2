
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while cancelling shipment` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({
      where: { id: id },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    if (["DELIVERED", "OUT_FOR_DELIVERY"].includes(shipment.status)) {
      return NextResponse.json(
        {
          error: "Cannot cancel shipment that is out for delivery or delivered",
        },
        { status: 400 }
      );
    }

    await prisma.shipment.update({
      where: { id: id },
      data: { status: "FAILED" },
    });

    return NextResponse.json({
      message: "Shipment cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel shipment error:", error);
    return NextResponse.json(
      { error: "Failed to cancel shipment" },
      { status: 500 }
    );
  }
}