import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating bulk shipment` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { shipments } = body;

    if (!Array.isArray(shipments)) {
      return NextResponse.json(
        { error: "Shipments array is required" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const shipmentData of shipments) {
      try {
        await prisma.shipment.create({
          data: {
            ...shipmentData,
            status: "LABEL_CREATED",
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          orderId: shipmentData.orderId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Bulk shipment creation completed. ${results.success} succeeded, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error("Bulk create shipments error:", error);
    return NextResponse.json(
      { error: "Failed to create shipments" },
      { status: 500 }
    );
  }
}
