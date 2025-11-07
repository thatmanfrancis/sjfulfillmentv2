import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching currencies` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const where: any = {};

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const currencies = await prisma.currency.findMany({
      where,
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("Get currencies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching currencies` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { code, name, symbol, decimalPlaces } = body;

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { error: "Code, name, and symbol are required" },
        { status: 400 }
      );
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.toUpperCase(),
        name,
        symbol,
        decimalPlaces: decimalPlaces || 2,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Currency created successfully",
        currency,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create currency error:", error);
    return NextResponse.json(
      { error: "Failed to create currency" },
      { status: 500 }
    );
  }
}
