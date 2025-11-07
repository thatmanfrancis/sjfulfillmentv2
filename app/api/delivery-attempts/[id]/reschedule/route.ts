import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while attempting delivery` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { eta, comments } = body;

    if (!eta) {
      return NextResponse.json(
        { error: "New ETA is required" },
        { status: 400 }
      );
    }

    const attempt = await prisma.deliveryAttempt.update({
      where: { id: id },
      data: {
        status: "scheduled",
        eta: new Date(eta),
        comments,
      },
    });

    return NextResponse.json({
      message: "Delivery rescheduled successfully",
      attempt,
    });
  } catch (error) {
    console.error("Reschedule delivery error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule delivery" },
      { status: 500 }
    );
  }
}
