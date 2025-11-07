import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while duplicating product` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const original = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!original) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate new SKU
    const newSku = `${original.sku}-COPY-${Date.now()}`;

    const duplicate = await prisma.product.create({
      data: {
        merchantId: original.merchantId,
        sku: newSku,
        barcode: original.barcode,
        name: `${original.name} (Copy)`,
        description: original.description,
        categoryId: original.categoryId,
        weight: original.weight,
        weightUnit: original.weightUnit,
        dimensions: original.dimensions as any,
        dimensionUnit: original.dimensionUnit,
        costPrice: original.costPrice,
        sellingPrice: original.sellingPrice,
        images: original.images || [],
        requiresShipping: original.requiresShipping,
        isFragile: original.isFragile,
        customsInfo: original.customsInfo as any,
        customFields: original.customFields as any,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      message: "Product duplicated successfully",
      product: duplicate,
    });
  } catch (error) {
    console.error("Duplicate product error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate product" },
      { status: 500 }
    );
  }
}
