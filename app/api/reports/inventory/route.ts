import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching inventory report` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const warehouseId = searchParams.get("warehouseId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (merchantId) {
      where.product = { merchantId };
    } else if (!isAdmin) {
      where.product = { merchantId: { in: merchantIds } };
    }

    const [totalProducts, totalUnits, lowStockCount, outOfStock] =
      await Promise.all([
        prisma.inventory.count({ where }),
        prisma.inventory.aggregate({
          where,
          _sum: {
            quantityAvailable: true,
            quantityReserved: true,
          },
        }),
        prisma.inventory.count({
          where: {
            ...where,
            quantityAvailable: {
              lte: prisma.inventory.fields.reorderPoint,
            },
            reorderPoint: { not: null },
          },
        }),
        prisma.inventory.count({
          where: {
            ...where,
            quantityAvailable: 0,
          },
        }),
      ]);

    return NextResponse.json({
      report: {
        totalProducts,
        totalUnits:
          (totalUnits._sum.quantityAvailable || 0) +
          (totalUnits._sum.quantityReserved || 0),
        availableUnits: totalUnits._sum.quantityAvailable || 0,
        reservedUnits: totalUnits._sum.quantityReserved || 0,
        lowStockCount,
        outOfStock,
      },
    });
  } catch (error) {
    console.error("Get inventory report error:", error);
    return NextResponse.json(
      { error: "Failed to generate inventory report" },
      { status: 500 }
    );
  }
}
