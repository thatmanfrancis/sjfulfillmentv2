import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest, ctx: any) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { warehouses } = body; // [{ warehouseId, quantity, minStockLevel, maxStockLevel, binLocation }]

    if (!Array.isArray(warehouses) || warehouses.length === 0) {
      return NextResponse.json({ error: "Invalid warehouses payload" }, { status: 400 });
    }

    // extract product id from params (context may be untyped)
    const productId = ctx?.params?.id as string | undefined;
    if (!productId) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    // verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Upsert inventory entries in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const ops = warehouses.map((w: any) => {
        const warehouseId = w.warehouseId;
        const qty = Number(w.quantity || 0);
        const reorderPoint = w.minStockLevel != null ? Number(w.minStockLevel) : null;
        const reorderQuantity = w.maxStockLevel != null ? Number(w.maxStockLevel) : null;
        const binLocation = w.binLocation || null;

        return tx.inventory.upsert({
          where: { productId_warehouseId: { productId: product.id, warehouseId } },
          update: {
            quantityAvailable: qty,
            quantityReserved: 0,
            quantityIncoming: 0,
            reorderPoint: reorderPoint,
            reorderQuantity: reorderQuantity,
            binLocation: binLocation,
          },
          create: {
            productId: product.id,
            warehouseId: warehouseId,
            quantityAvailable: qty,
            quantityReserved: 0,
            quantityIncoming: 0,
            reorderPoint: reorderPoint,
            reorderQuantity: reorderQuantity,
            binLocation: binLocation,
          },
        });
      });

  await Promise.all(ops);

      return tx.inventory.findMany({ where: { productId: product.id }, include: { warehouse: true } });
    });

    return NextResponse.json({ message: "Distribution updated", inventories: updated }, { status: 200 });
  } catch (error) {
    console.error("Update distribution error:", error);
    return NextResponse.json({ error: "Failed to update distribution" }, { status: 500 });
  }
}
