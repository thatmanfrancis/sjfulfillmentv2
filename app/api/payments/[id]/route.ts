import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching payment` }, { status: 400});
  }

  try {
    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id: id },
      include: {
        merchant: true,
        customer: true,
        currency: true,
        invoice: true,
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
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
    return NextResponse.json({ message: `Error occurred while fetching payment` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, gatewayResponse } = body;

    const payment = await prisma.payment.update({
      where: { id: id },
      data: {
        ...(status && { status }),
        ...(gatewayResponse && { gatewayResponse }),
        ...(status === "COMPLETED" && { paidAt: new Date() }),
      },
    });

    return NextResponse.json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Update payment error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
