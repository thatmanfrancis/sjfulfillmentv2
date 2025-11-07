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
      { message: `Error occured while attempting delivery` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const attempt = await prisma.deliveryAttempt.findUnique({
      where: { id: id },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
          },
        },
        handler: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Delivery attempt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Get delivery attempt error:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery attempt" },
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
    return NextResponse.json(
      { message: `Error occured while attempting delivery` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, eta, comments } = body;

    const attempt = await prisma.deliveryAttempt.update({
      where: { id: id },
      data: {
        ...(status && { status }),
        ...(eta !== undefined && { eta }),
        ...(comments !== undefined && { comments }),
      },
    });

    return NextResponse.json({
      message: "Delivery attempt updated successfully",
      attempt,
    });
  } catch (error) {
    console.error("Update delivery attempt error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery attempt" },
      { status: 500 }
    );
  }
}
