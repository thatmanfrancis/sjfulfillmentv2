import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while processing restock` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { warehouseId, restockableItems } = body;

    if (!warehouseId || !Array.isArray(restockableItems)) {
      return NextResponse.json(
        { error: "Warehouse ID and restockable items are required" },
        { status: 400 }
      );
    }

    // Restock each item
    for (const item of restockableItems) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId,
          },
        },
      });

      if (inventory) {
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: {
            quantityAvailable: {
              increment: item.quantity,
            },
          },
        });

        // Create transaction
        await prisma.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            transactionType: "RETURN",
            quantityChange: item.quantity,
            quantityAfter: inventory.quantityAvailable + item.quantity,
            notes: `Return restocked: ${id}`,
            createdBy: auth.userId as string,
          },
        });
      }
    }

    // Update return status
    const returnRecord = await prisma.return.update({
      where: { id: id },
      data: {
        status: "RESTOCKED",
        processedBy: auth.userId as string,
      },
    });

    return NextResponse.json({
      message: "Items restocked successfully",
      return: returnRecord,
      restockedCount: restockableItems.length,
    });
  } catch (error) {
    console.error("Restock return error:", error);
    return NextResponse.json(
      { error: "Failed to restock items" },
      { status: 500 }
    );
  }
}
