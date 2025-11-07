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
      { message: `Error occurred while inspecting return` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { inspectionNotes, condition } = body;

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status: "INSPECTED",
        customerNotes: inspectionNotes,
        processedBy: auth.userId as string,
      },
    });

    return NextResponse.json({
      message: "Return inspected successfully",
      return: returnRecord,
      condition,
    });
  } catch (error) {
    console.error("Inspect return error:", error);
    return NextResponse.json(
      { error: "Failed to inspect return" },
      { status: 500 }
    );
  }
}
