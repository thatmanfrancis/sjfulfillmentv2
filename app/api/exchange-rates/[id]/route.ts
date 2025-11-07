import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating exchange rate` },
      { status: 400 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { rate, effectiveFrom, source } = body;

    if (!rate || rate <= 0) {
      return NextResponse.json(
        { error: "Valid rate is required" },
        { status: 400 }
      );
    }

    const exchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        rate,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        source,
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });

    return NextResponse.json({
      message: "Exchange rate updated successfully",
      exchangeRate,
    });
  } catch (error) {
    console.error("Update exchange rate error:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rate" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while deleting exchange rate` },
      { status: 400 }
    );
  }

  try {
    const { id } = await context.params;

    await prisma.exchangeRate.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Exchange rate deleted successfully",
    });
  } catch (error) {
    console.error("Delete exchange rate error:", error);
    return NextResponse.json(
      { error: "Failed to delete exchange rate" },
      { status: 500 }
    );
  }
}
