import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

async function generateUniqueSku(merchantId: string, baseName = 'PROD') {
  const sanitize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'PROD';
  const prefix = sanitize(merchantId || 'MRC');
  const base = sanitize(baseName);

  for (let i = 0; i < 6; i++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `${prefix}-${base}-${suffix}`.slice(0, 64);
    const existing = await prisma.product.findUnique({ where: { merchantId_sku: { merchantId, sku: candidate } } }).catch(() => null);
    if (!existing) return candidate;
  }
  // fallback
  return `${prefix}-${base}-${Date.now()}`;
}

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
                  code: true,
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
      defaultWarehouseId,
      defaultQuantity,
    } = body;

    if (!merchantId || !name) {
      return NextResponse.json(
        { error: "Merchant ID and name are required" },
        { status: 400 }
      );
    }

    // generate SKU if missing
    const finalSku = sku && sku.trim() ? sku.trim() : await generateUniqueSku(merchantId, name);

    // Check if SKU already exists for merchant
    const existingProduct = await prisma.product.findUnique({
      where: {
        merchantId_sku: {
          merchantId,
          sku: finalSku,
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
        sku: finalSku,
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

    // Create or upsert warehouse inventory if provided (map to schema fields)
    const inventoriesToUpsert = warehouses && warehouses.length > 0 ? warehouses : (defaultWarehouseId ? [{ warehouseId: defaultWarehouseId, quantity: defaultQuantity ?? 0 }] : []);

    if (inventoriesToUpsert && inventoriesToUpsert.length > 0) {
      const tx = await prisma.$transaction(async (tx) => {
        const ops = inventoriesToUpsert.map((w: any) => {
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

        // Return the product with inventory
        return tx.product.findUnique({
          where: { id: product.id },
          include: {
            category: true,
            merchant: { select: { id: true, businessName: true } },
            inventory: { include: { warehouse: { select: { id: true, name: true, address: true, isShared: true, capacity: true } } } },
          },
        });
      });

      return NextResponse.json(
        {
          message: "Product created successfully with warehouse inventory",
          product: tx,
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