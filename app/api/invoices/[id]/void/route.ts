import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while voiding invoice` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      message: "Invoice voided successfully",
      invoice,
    });
  } catch (error) {
    console.error("Void invoice error:", error);
    return NextResponse.json(
      { error: "Failed to void invoice" },
      { status: 500 }
    );
  }
}
