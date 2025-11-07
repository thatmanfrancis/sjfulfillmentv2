import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching call logs` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const callLogs = await prisma.callLog.findMany({
      where: { orderId: id },
      orderBy: { callDate: "desc" },
      include: {
        caller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ callLogs });
  } catch (error) {
    console.error("Get call logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 }
    );
  }
}


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating call logs` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { customerId, duration, notes, outcome } = body;

    if (!customerId || !outcome) {
      return NextResponse.json(
        { error: "Customer ID and outcome are required" },
        { status: 400 }
      );
    }

    // Validate outcome
    const validOutcomes = ["VERIFIED", "NO_ANSWER", "CANCELLED", "RESCHEDULED"];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        {
          error:
            "Invalid outcome. Must be one of: VERIFIED, NO_ANSWER, CANCELLED, RESCHEDULED",
        },
        { status: 400 }
      );
    }

    const callLog = await prisma.callLog.create({
      data: {
        orderId: id,
        customerId,
        callerId: auth.userId as string,
        duration,
        notes,
        outcome,
      },
      include: {
        caller: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // If call verified, update order status
    if (outcome === "VERIFIED") {
      await prisma.order.update({
        where: { id: id },
        data: { status: "CONFIRMED" },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          newStatus: "CONFIRMED",
          changedBy: auth.userId as string,
          notes: "Order confirmed via phone call",
        },
      });
    }

    // If cancelled, update order
    if (outcome === "CANCELLED") {
      await prisma.order.update({
        where: { id: id },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json(
      {
        message: "Call log created successfully",
        callLog,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create call log error:", error);
    return NextResponse.json(
      { error: "Failed to create call log" },
      { status: 500 }
    );
  }
}