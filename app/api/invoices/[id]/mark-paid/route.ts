import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while marking invoice as paid` },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        amountPaid: Number(prisma.invoice.fields.totalAmount),
        amountDue: 0,
      },
    });

    return NextResponse.json({
      message: "Invoice marked as paid successfully",
      invoice,
    });
  } catch (error) {
    console.error("Mark invoice paid error:", error);
    return NextResponse.json(
      { error: "Failed to mark invoice as paid" },
      { status: 500 }
    );
  }
}
