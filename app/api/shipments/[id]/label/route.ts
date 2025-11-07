import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while generating label` }, { status: 400 });
  }

  try {
    const { id } = await params;
    // TODO: Integrate with shipping carrier API to generate actual label
    // For now, just update the shipment with a mock label URL

    const labelUrl = `https://labels.example.com/${id}.pdf`;

    const shipment = await prisma.shipment.update({
      where: { id: id },
      data: {
        labelUrl,
        status: "LABEL_CREATED",
      },
    });

    return NextResponse.json({
      message: "Shipping label generated successfully",
      labelUrl,
      shipment,
    });
  } catch (error) {
    console.error("Generate label error:", error);
    return NextResponse.json(
      { error: "Failed to generate shipping label" },
      { status: 500 }
    );
  }
}
