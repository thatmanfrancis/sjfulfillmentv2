import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching products` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const merchantId = searchParams.get("merchantId");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      deletedAt: null,
    };

    // Filter by merchant
    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
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
                },
              },
            },
          },
          _count: {
            select: {
              inventory: true,
              orderItems: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating product` }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
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
      warehouses, // Array of { warehouseId, quantity, minStockLevel, maxStockLevel }
    } = body;

    if (!merchantId || !sku || !name) {
      return NextResponse.json(
        { error: "Merchant ID, SKU, and name are required" },
        { status: 400 }
      );
    }

    // Check if SKU already exists for merchant
    const existingProduct = await prisma.product.findUnique({
      where: {
        merchantId_sku: {
          merchantId,
          sku,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product with this SKU already exists" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        merchantId,
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
        requiresShipping: requiresShipping ?? true,
        isFragile: isFragile ?? false,
        customsInfo,
        customFields,
        status: "ACTIVE",
      },
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
                address: true,
                isShared: true,
                capacity: true,
              },
            },
          },
        },
      },
    });

    // Create warehouse inventory if provided
    if (warehouses && warehouses.length > 0) {
      const inventoryData = warehouses.map((warehouse: any) => ({
        productId: product.id,
        warehouseId: warehouse.warehouseId,
        quantity: warehouse.quantity || 0,
        minStockLevel: warehouse.minStockLevel || 0,
        maxStockLevel: warehouse.maxStockLevel || 1000,
      }));

      await prisma.inventory.createMany({
        data: inventoryData,
      });

      // Fetch the updated product with inventory
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
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
                  address: true,
                  isShared: true,
                  capacity: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json(
        {
          message: "Product created successfully with warehouse inventory",
          product: updatedProduct,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { message: "Failed to create product" },
      { status: 500 }
    );
  }
}