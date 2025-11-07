import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { paymentStatus } = body;

    if (!paymentStatus) {
      return NextResponse.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: id },
      data: { paymentStatus },
    });

    // Update customer lifetime value if paid
    if (paymentStatus === "PAID") {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: {
          lifetimeValue: { increment: order.totalAmount },
        },
      });
    }

    return NextResponse.json({
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}
