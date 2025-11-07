import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while scheduling pickup` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { pickupDate, notes } = body;

    // TODO: Integrate with carrier API to schedule actual pickup

    await prisma.shipment.update({
      where: { id: id },
      data: {
        status: "PICKED_UP",
        shippedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Pickup scheduled successfully",
      pickupDate,
    });
  } catch (error) {
    console.error("Schedule pickup error:", error);
    return NextResponse.json(
      { error: "Failed to schedule pickup" },
      { status: 500 }
    );
  }
}
