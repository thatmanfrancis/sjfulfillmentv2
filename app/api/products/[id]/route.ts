import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while fetching product` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        inventory: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while updating product` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      sku,
      barcode,
      name,
      description,
      categoryId,
      weight,
      weightUnit,
      dimensions,
      dimensionUnit,
      costPrice,
      sellingPrice,
      images,
      requiresShipping,
      isFragile,
      customsInfo,
      customFields,
    } = body;

    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If SKU is changing, check for duplicates
    if (sku && sku !== product.sku) {
      const duplicate = await prisma.product.findUnique({
        where: {
          merchantId_sku: {
            merchantId: product.merchantId,
            sku,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Product with this SKU already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id: id },
      data: {
        ...(sku && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId }),
        ...(weight !== undefined && { weight }),
        ...(weightUnit !== undefined && { weightUnit }),
        ...(dimensions !== undefined && { dimensions }),
        ...(dimensionUnit !== undefined && { dimensionUnit }),
        ...(costPrice !== undefined && { costPrice }),
        ...(sellingPrice !== undefined && { sellingPrice }),
        ...(images !== undefined && { images }),
        ...(requiresShipping !== undefined && { requiresShipping }),
        ...(isFragile !== undefined && { isFragile }),
        ...(customsInfo !== undefined && { customsInfo }),
        ...(customFields !== undefined && { customFields }),
      },
      include: {
        category: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Product updated successfully",
        product: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while fetching product` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
