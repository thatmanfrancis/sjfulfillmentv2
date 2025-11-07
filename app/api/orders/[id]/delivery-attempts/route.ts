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
      { message: `Unauthorized access` },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const attempts = await prisma.deliveryAttempt.findMany({
      where: { orderId: id },
      include: {
        handler: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { attemptedAt: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Get delivery attempts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery attempts" },
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
    return NextResponse.json({ message: `Unauthorized access` }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, eta, comments, handlerId } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Get current attempt number
    const lastAttempt = await prisma.deliveryAttempt.findFirst({
      where: { orderId: id },
      orderBy: { attemptNumber: "desc" },
    });

    const attemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

    const attempt = await prisma.deliveryAttempt.create({
      data: {
        orderId: id,
        attemptNumber,
        status,
        eta,
        comments,
        handlerId,
      },
      include: {
        handler: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Delivery attempt created successfully",
        attempt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create delivery attempt error:", error);
    return NextResponse.json(
      { error: "Failed to create delivery attempt" },
      { status: 500 }
    );
  }
}