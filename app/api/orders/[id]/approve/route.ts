import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body; // action: "approve" or "reject"

    // Check if user is admin
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can approve/reject orders" },
        { status: 403 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can be approved/rejected" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "PROCESSING" : "CANCELLED";

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
      },
      include: {
        customer: true,
        items: true,
        currency: true,
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        newStatus,
        changedBy: auth.userId as string,
        notes: notes || (action === "approve" ? "Order approved by admin" : "Order rejected by admin"),
      },
    });

    return NextResponse.json({
      message: `Order ${action}d successfully`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Approve/reject order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process order action" },
      { status: 500 }
    );
  }
}
