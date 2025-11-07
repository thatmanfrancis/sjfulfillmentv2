import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching exchange rates` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fromCurrencyId = searchParams.get("fromCurrencyId");
    const toCurrencyId = searchParams.get("toCurrencyId");

    const where: any = {
      isActive: true,
    };

    if (fromCurrencyId) {
      where.fromCurrencyId = fromCurrencyId;
    }

    if (toCurrencyId) {
      where.toCurrencyId = toCurrencyId;
    }

    const exchangeRates = await prisma.exchangeRate.findMany({
      where,
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return NextResponse.json({ exchangeRates });
  } catch (error) {
    console.error("Get exchange rates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching exchange rates` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { fromCurrencyId, toCurrencyId, rate, effectiveFrom, source } = body;

    if (!fromCurrencyId || !toCurrencyId || !rate) {
      return NextResponse.json(
        { error: "From currency, to currency, and rate are required" },
        { status: 400 }
      );
    }

    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        fromCurrencyId,
        toCurrencyId,
        rate,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        source,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Exchange rate created successfully",
        exchangeRate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create exchange rate error:", error);
    return NextResponse.json(
      { error: "Failed to create exchange rate" },
      { status: 500 }
    );
  }
}
