import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching user authentication` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { orderIds, status, notes } = body;

    if (!Array.isArray(orderIds) || !status) {
      return NextResponse.json(
        { error: "Order IDs array and status are required" },
        { status: 400 }
      );
    }

    const result = await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: { status },
    });

    // Create status history for each order
    const historyPromises = orderIds.map((orderId) =>
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          newStatus: status,
          changedBy: auth.userId as string,
          notes: notes || "Bulk status update",
        },
      })
    );

    await Promise.all(historyPromises);

    return NextResponse.json({
      message: `${result.count} orders updated successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error("Bulk update status error:", error);
    return NextResponse.json(
      { error: "Failed to update orders" },
      { status: 500 }
    );
  }
}
