import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching products` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeSubcategories =
      searchParams.get("includeSubcategories") === "true";

    const skip = (page - 1) * limit;

    let categoryIds = [id];

    // Get all subcategory IDs if requested
    if (includeSubcategories) {
      const subcategories = await getAllSubcategoryIds(id);
      categoryIds = [...categoryIds, ...subcategories];
    }

    const where: any = {
      categoryId: { in: categoryIds },
      deletedAt: null,
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
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
    console.error("Get category products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// Helper function to get all subcategory IDs recursively
async function getAllSubcategoryIds(categoryId: string): Promise<string[]> {
  const children = await prisma.productCategory.findMany({
    where: { parentCategoryId: categoryId },
    select: { id: true },
  });

  let allIds: string[] = [];

  for (const child of children) {
    allIds.push(child.id);
    const grandchildren = await getAllSubcategoryIds(child.id);
    allIds = [...allIds, ...grandchildren];
  }

  return allIds;
}
