import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id: id },
      data: { assignedTo: userId },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send notification to assigned user
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification({
      userId,
      merchantId: order.merchantId,
      type: "ORDER_STATUS",
      title: "Order Assigned",
      message: `Order ${order.orderNumber} has been assigned to you`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id },
    });

    return NextResponse.json({
      message: "Order assigned successfully",
      order,
    });
  } catch (error) {
    console.error("Assign order error:", error);
    return NextResponse.json(
      { error: "Failed to assign order" },
      { status: 500 }
    );
  }
}
