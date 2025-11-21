import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// GET /api/merchant/products - List merchant's products (with search)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user || !authResult.user.businessId) {
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
      products: products.map(product => ({
        ...product,
        totalStock: (product.StockAllocation ?? []).reduce(
          (sum: number, allocation: any) => sum + allocation.allocatedQuantity,
          0
        ),
        availableStock: (product.StockAllocation ?? []).reduce(
          (sum: number, allocation: any) => sum + (allocation.allocatedQuantity - allocation.safetyStock),
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
