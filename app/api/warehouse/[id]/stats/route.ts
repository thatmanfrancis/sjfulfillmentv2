import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching warehouse statistics` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const [
      totalProducts,
      totalUnits,
      lowStockCount,
      assignedOrders,
      spaceUsed,
    ] = await Promise.all([
      prisma.inventory.count({
        where: { warehouseId: id },
      }),
      prisma.inventory.aggregate({
        where: { warehouseId: id },
        _sum: {
          quantityAvailable: true,
          quantityReserved: true,
        },
      }),
      prisma.inventory.count({
        where: {
          warehouseId: id,
          quantityAvailable: {
            lte: prisma.inventory.fields.reorderPoint,
          },
          reorderPoint: { not: null },
        },
      }),
      prisma.order.count({
        where: {
          warehouseId: id,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        },
      }),
      prisma.inventory.aggregate({
        where: { warehouseId: id },
        _sum: { cubicMeters: true },
      }),
    ]);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id },
      select: { capacity: true },
    });

    return NextResponse.json({
      stats: {
        totalProducts,
        totalUnits:
          (totalUnits._sum.quantityAvailable || 0) +
          (totalUnits._sum.quantityReserved || 0),
        availableUnits: totalUnits._sum.quantityAvailable || 0,
        reservedUnits: totalUnits._sum.quantityReserved || 0,
        lowStockCount,
        assignedOrders,
        spaceUsed: spaceUsed._sum.cubicMeters || 0,
        capacity: warehouse?.capacity || 0,
        utilizationPercentage: warehouse?.capacity
          ? ((spaceUsed._sum.cubicMeters || 0) / warehouse.capacity) * 100
          : 0,
      },
    });
  } catch (error) {
    console.error("Get warehouse stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse statistics" },
      { status: 500 }
    );
  }
}
