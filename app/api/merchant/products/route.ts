import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";


// Helper to get or create Default warehouse for a business
async function getOrCreateDefaultWarehouse(businessId: string) {
  let warehouse = await prisma.warehouse.findFirst({
    where: {
      name: { equals: "Default", mode: "insensitive" },
      status: "ACTIVE",
      Order: {
        some: {
          merchantId: businessId,
        },
      },
    },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        id: crypto.randomUUID(),
        name: "Default",
        region: "Default",
        status: "ACTIVE",
        type: "STORAGE",
        updatedAt: new Date(),
      },
    });
  }
  return warehouse;
}

// GET /api/merchant/products - List merchant's products (with search)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (
      !authResult.success ||
      !authResult.user ||
      !authResult.user.businessId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    let where: any = { businessId: authResult.user.businessId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          StockAllocation: {
            include: {
              Warehouse: true,
            },
          },
          ProductImage: true,
          _count: { select: { OrderItem: true } },
        },
        skip,
        take: limit,
        orderBy: { name: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map((product) => ({
        ...product,
        totalStock: (product.StockAllocation ?? []).reduce(
          (sum: number, allocation: any) => sum + allocation.allocatedQuantity,
          0
        ),
        availableStock: (product.StockAllocation ?? []).reduce(
          (sum: number, allocation: any) =>
            sum + (allocation.allocatedQuantity - allocation.safetyStock),
          0
        ),
        orderCount: product._count?.OrderItem ?? 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching merchant products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/merchant/products - Create or bulk upload products
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (
      !authResult.success ||
      !authResult.user ||
      !authResult.user.businessId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const businessId = authResult.user.businessId;
    const body = await request.json();
    let products: any[] = [];
    if (Array.isArray(body)) {
      products = body;
    } else if (body.products && Array.isArray(body.products)) {
      products = body.products;
    } else if (body.name && body.sku) {
      products = [body];
    } else {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const defaultWarehouse = await getOrCreateDefaultWarehouse(businessId);
    const createdProducts = [];
    const errors = [];
    for (const prod of products) {
      try {
        // Required fields: name, sku, weightKg, dimensions
        if (!prod.name || !prod.sku || !prod.weightKg || !prod.dimensions) {
          errors.push({ sku: prod.sku, error: "Missing required fields" });
          continue;
        }
        // Price is optional
        const price = typeof prod.price === "number" ? prod.price : undefined;
        // Warehouse assignment: try to find by name, else use Default
        let warehouseId = prod.warehouseId;
        if (prod.warehouseName) {
          const foundWarehouse = await prisma.warehouse.findFirst({
            where: {
              name: { equals: prod.warehouseName, mode: "insensitive" },
              status: "ACTIVE",
            },
          });
          if (foundWarehouse) {
            warehouseId = foundWarehouse.id;
          } else {
            warehouseId = defaultWarehouse.id;
          }
        } else if (!warehouseId) {
          warehouseId = defaultWarehouse.id;
        }
        // Create product
        const created = await prisma.product.create({
          data: {
            id: crypto.randomUUID(),
            businessId,
            sku: prod.sku,
            name: prod.name,
            weightKg: prod.weightKg,
            dimensions: prod.dimensions,
            imageUrl: prod.imageUrl,
            price,
            Business: { connect: { id: businessId } },
            StockAllocation: {
              create: {
                id: crypto.randomUUID(),
                warehouseId,
                allocatedQuantity: prod.allocatedQuantity ?? 0,
                safetyStock: prod.safetyStock ?? 0,
              },
            },
          },
        });
        createdProducts.push(created);
      } catch (err: any) {
        errors.push({ sku: prod.sku, error: err.message });
      }
    }
    return NextResponse.json({
      success: true,
      createdCount: createdProducts.length,
      errorCount: errors.length,
      errors,
      products: createdProducts,
      message: `${createdProducts.length} products created, ${errors.length} errors.`,
    });
  } catch (error) {
    console.error("Error uploading merchant products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
