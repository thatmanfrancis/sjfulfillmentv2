import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing priceTierGroupId" },
        { status: 400 }
      );
    }
    const group = await prisma.priceTierGroup.findUnique({
      where: { id },
      include: {
        pricingTiers: true, // Adjust to match your actual relation name
      },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Price tier group not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ group });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch price tier group",
      },
      { status: 500 }
    );
  }
}
