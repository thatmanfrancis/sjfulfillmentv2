import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
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
    const { itemIds } = body; // Array of order item IDs

    if (!itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: "Item IDs array is required" },
        { status: 400 }
      );
    }

    // Update items to picked
    await prisma.orderItem.updateMany({
      where: {
        id: { in: itemIds },
        orderId: id,
      },
      data: {
        status: "PICKED",
        pickedBy: auth.userId as string,
        pickedAt: new Date(),
      },
    });

    // Check if all items are picked
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allPicked = order.items.every((item) => item.status === "PICKED");

    // Update order status if all items picked
    if (allPicked) {
      await prisma.order.update({
        where: { id: id },
        data: { status: "PICKED" },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: order.status,
          newStatus: "PICKED",
          changedBy: auth.userId as string,
          notes: "All items picked",
        },
      });
    }

    return NextResponse.json({
      message: "Items marked as picked successfully",
      pickedCount: itemIds.length,
      allPicked,
    });
  } catch (error) {
    console.error("Pick order items error:", error);
    return NextResponse.json(
      { error: "Failed to pick order items" },
      { status: 500 }
    );
  }
}
