import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching warehouse capacity` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id },
      select: { capacity: true, name: true },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    const spaceUsage = await prisma.inventory.aggregate({
      where: {
        warehouseId: id,
        cubicMeters: { not: null },
      },
      _sum: { cubicMeters: true },
      _count: true,
    });

    const totalUsed = spaceUsage._sum.cubicMeters || 0;
    const capacity = warehouse.capacity || 0;
    const available = capacity - totalUsed;
    const utilizationPercentage =
      capacity > 0 ? (totalUsed / capacity) * 100 : 0;

    return NextResponse.json({
      capacity: {
        total: capacity,
        used: totalUsed,
        available: available > 0 ? available : 0,
        utilizationPercentage,
        itemsTracked: spaceUsage._count,
        status:
          utilizationPercentage >= 90
            ? "critical"
            : utilizationPercentage >= 75
            ? "warning"
            : "normal",
      },
    });
  } catch (error) {
    console.error("Get warehouse capacity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse capacity" },
      { status: 500 }
    );
  }
}
