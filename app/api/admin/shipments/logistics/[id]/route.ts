import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{id: string}> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Only admin can view logistics shipments
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    const { id } = await context.params;
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }
    // Find shipments assigned to this logistics user
    const shipments = await prisma.shipment.findMany({
      where: {
        Order: {
          assignedLogisticsId: id,
          //   userId: params.id,
          status: "DELIVERED", // Only completed shipments
        },
      },
      include: {
        Order: true,
      },
      orderBy: { lastStatusUpdate: "desc" },
    });
    return NextResponse.json({ success: true, shipments });
  } catch (error) {
    console.error("Fetch logistics shipments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
