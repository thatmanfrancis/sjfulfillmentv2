import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching shipping rates` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const carrierId = searchParams.get("carrierId");

    const where: any = {};

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (carrierId) {
      where.carrierId = carrierId;
    }

    const rates = await prisma.shippingRate.findMany({
      where,
      include: {
        carrier: true,
        currency: true,
      },
      orderBy: { rate: "asc" },
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Get shipping rates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping rates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching shipping rates` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      carrierId,
      serviceLevel,
      originCountry,
      destinationCountry,
      weightMin,
      weightMax,
      rate,
      currencyId,
      effectiveFrom,
    } = body;

    if (!carrierId || !serviceLevel || !rate || !currencyId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    const shippingRate = await prisma.shippingRate.create({
      data: {
        merchantId,
        carrierId,
        serviceLevel,
        originCountry: originCountry || "US",
        destinationCountry: destinationCountry || "US",
        weightMin,
        weightMax,
        rate,
        currencyId,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Shipping rate created successfully",
        shippingRate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create shipping rate error:", error);
    return NextResponse.json(
      { error: "Failed to create shipping rate" },
      { status: 500 }
    );
  }
}
