import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching return` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const returnRecord = await prisma.return.findUnique({
      where: { id: id },
      include: {
        order: {
          include: {
            customer: true,
            items: true,
          },
        },
        processor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!returnRecord) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    return NextResponse.json({ return: returnRecord });
  } catch (error) {
    console.error("Get return error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return" },
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
    return NextResponse.json({ message: `Error occurred while updating return` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { trackingNumber, refundAmount, restockingFee, returnShippingCost } =
      body;

    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(refundAmount !== undefined && { refundAmount }),
        ...(restockingFee !== undefined && { restockingFee }),
        ...(returnShippingCost !== undefined && { returnShippingCost }),
      },
    });

    return NextResponse.json({
      message: "Return updated successfully",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Update return error:", error);
    return NextResponse.json(
      { error: "Failed to update return" },
      { status: 500 }
    );
  }
}