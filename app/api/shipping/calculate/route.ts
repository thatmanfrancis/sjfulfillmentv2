import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching shipping rates` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { merchantId, weight, originCountry, destinationCountry } = body;

    if (!weight || !destinationCountry) {
      return NextResponse.json(
        { error: "Weight and destination country are required" },
        { status: 400 }
      );
    }

    const rates = await prisma.shippingRate.findMany({
      where: {
        ...(merchantId && { merchantId }),
        destinationCountry,
        OR: [
          {
            weightMin: { lte: weight },
            weightMax: { gte: weight },
          },
          {
            weightMin: null,
            weightMax: null,
          },
        ],
      },
      include: {
        carrier: true,
        currency: true,
      },
    });

    return NextResponse.json({
      rates,
      count: rates.length,
    });
  } catch (error) {
    console.error("Calculate shipping error:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping" },
      { status: 500 }
    );
  }
}
