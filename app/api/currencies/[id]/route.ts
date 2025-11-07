import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching currency` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const currency = await prisma.currency.findUnique({
      where: { id },
    });

    if (!currency) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ currency });
  } catch (error) {
    console.error("Get currency error:", error);
    return NextResponse.json(
      { error: "Failed to fetch currency" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching currency` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, symbol, decimalPlaces, isActive } = body;

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(symbol && { symbol }),
        ...(decimalPlaces !== undefined && { decimalPlaces }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      message: "Currency updated successfully",
      currency,
    });
  } catch (error) {
    console.error("Update currency error:", error);
    return NextResponse.json(
      { error: "Failed to update currency" },
      { status: 500 }
    );
  }
}
