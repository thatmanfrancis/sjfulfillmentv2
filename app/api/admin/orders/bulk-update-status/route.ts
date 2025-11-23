import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "ADMIN") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const body = await req.json();
    const { orderIds, status } = body;
    if (
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      typeof status !== "string"
    ) {
      return Response.json(
        { error: "Missing orderIds or status" },
        { status: 400 }
      );
    }

    // Only allow valid statuses
    const allowedStatuses = [
      "NEW",
      "AWAITING_ALLOC",
      "DISPATCHED",
      "PICKED_UP",
      "DELIVERING",
      "DELIVERED",
      "RETURNED",
      "CANCELED",
      "ON_HOLD",
    ];
    if (!allowedStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Bulk update orders
    const result = await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: status as any, orderDate: new Date() },
    });

    return Response.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Bulk update error:", error);
    return Response.json(
      { error: "Failed to bulk update orders" },
      { status: 500 }
    );
  }
}
