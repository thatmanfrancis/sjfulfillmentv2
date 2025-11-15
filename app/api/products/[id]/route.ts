import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/notifications";

const updateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  weightKg: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
}).partial();

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
        stockAllocations: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                region: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                customerName: true,
                status: true,
                orderDate: true,
              },
            },
          },
          take: 10, // Latest 10 orders
          orderBy: {
            order: {
              orderDate: "desc",
            },
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (
      authResult.user.role === "MERCHANT" ||
      authResult.user.role === "MERCHANT_STAFF"
    ) {
      if (product.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Calculate stock metrics
    const totalStock = product.stockAllocations.reduce(
      (sum, allocation) => sum + allocation.allocatedQuantity,
      0
    );
    const availableStock = product.stockAllocations.reduce(
      (sum, allocation) => sum + (allocation.allocatedQuantity - allocation.safetyStock),
      0
    );

    return NextResponse.json({
      ...product,
      totalStock,
      availableStock,
      orderCount: product._count.orderItems,
      recentOrders: product.orderItems,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only merchants and admins can update products
    if (!["MERCHANT", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        businessId: true,
        sku: true,
        name: true,
        weightKg: true,
        dimensions: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role === "MERCHANT") {
      if (existingProduct.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Check if SKU is being updated and doesn't conflict
    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: {
          businessId_sku: {
            businessId: existingProduct.businessId,
            sku: validatedData.sku,
          },
        },
      });

      if (skuConflict) {
        return NextResponse.json(
          { error: "Product with this SKU already exists" },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: validatedData,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        stockAllocations: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                region: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      authResult.user.id,
      "Product",
      updatedProduct.id,
      "PRODUCT_UPDATED",
      {
        before: existingProduct,
        after: validatedData,
        changes: Object.keys(validatedData),
      }
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only merchants and admins can delete products
    if (!["MERCHANT", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: {
          select: { id: true },
        },
        stockAllocations: {
          select: { id: true },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role === "MERCHANT") {
      if (existingProduct.businessId !== authResult.user.businessId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Check if product has associated orders
    if (existingProduct.orderItems.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete product that has associated orders. Consider archiving instead." 
        },
        { status: 400 }
      );
    }

    // Delete stock allocations first
    if (existingProduct.stockAllocations.length > 0) {
      await prisma.stockAllocation.deleteMany({
        where: { productId: id },
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog(
      authResult.user.id,
      "Product",
      id,
      "PRODUCT_DELETED",
      {
        deletedProduct: {
          sku: existingProduct.sku,
          name: existingProduct.name,
          businessId: existingProduct.businessId,
        },
      }
    );

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}