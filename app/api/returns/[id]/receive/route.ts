import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while receiving return` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { notes } = body;

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        processedBy: auth.userId as string,
      },
    });

    return NextResponse.json({
      message: "Return marked as received successfully",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Receive return error:", error);
    return NextResponse.json(
      { error: "Failed to receive return" },
      { status: 500 }
    );
  }
}
