import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/notifications";

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  weightKg: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

const updateProductSchema = createProductSchema.partial();

// GET /api/products - List products (with filtering)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const businessId = searchParams.get("businessId");

    const skip = (page - 1) * limit;

    // Build where clause based on user role and filters
    let where: any = {};

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only see their own products
      where.businessId = authResult.user.businessId;
    } else if (businessId && authResult.user.role === "ADMIN") {
      // Admin can filter by specific business
      where.businessId = businessId;
    }

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
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map(product => ({
        ...product,
        totalStock: product.stockAllocations.reduce(
          (sum, allocation) => sum + allocation.allocatedQuantity,
          0
        ),
        availableStock: product.stockAllocations.reduce(
          (sum, allocation) => sum + (allocation.allocatedQuantity - allocation.safetyStock),
          0
        ),
        orderCount: product._count.orderItems,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only merchants and admins can create products
    if (!["MERCHANT", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Determine business ID
    let businessId: string;
    if (authResult.user.role === "MERCHANT") {
      if (!authResult.user.businessId) {
        return NextResponse.json(
          { error: "No business associated with user" },
          { status: 400 }
        );
      }
      businessId = authResult.user.businessId;
    } else {
      // Admin can specify businessId in the request
      if (!body.businessId) {
        return NextResponse.json(
          { error: "businessId is required for admin users" },
          { status: 400 }
        );
      }
      businessId = body.businessId;
    }

    // Check if SKU already exists for this business
    const existingProduct = await prisma.product.findUnique({
      where: {
        businessId_sku: {
          businessId,
          sku: validatedData.sku,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Product with this SKU already exists" },
        { status: 400 }
      );
    }

    // Validate dimensions object structure
    const dimensions = validatedData.dimensions;

    const product = await prisma.product.create({
      data: {
        businessId,
        sku: validatedData.sku,
        name: validatedData.name,
        weightKg: validatedData.weightKg,
        dimensions,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      authResult.user.id,
      "Product",
      product.id,
      "PRODUCT_CREATED",
      {
        sku: product.sku,
        name: product.name,
        businessId: product.businessId,
      }
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}