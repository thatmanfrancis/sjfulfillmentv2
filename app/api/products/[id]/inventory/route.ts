import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching inventory` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const inventory = await prisma.inventory.findMany({
      where: { productId: id },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const totalAvailable = inventory.reduce(
      (sum, inv) => sum + inv.quantityAvailable,
      0
    );
    const totalReserved = inventory.reduce(
      (sum, inv) => sum + inv.quantityReserved,
      0
    );
    const totalIncoming = inventory.reduce(
      (sum, inv) => sum + inv.quantityIncoming,
      0
    );

    return NextResponse.json({
      inventory,
      summary: {
        totalAvailable,
        totalReserved,
        totalIncoming,
        totalOnHand: totalAvailable + totalReserved,
      },
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
