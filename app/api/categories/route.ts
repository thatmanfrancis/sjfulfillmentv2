
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching categories` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const parentId = searchParams.get("parentId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    // Filter by merchant
    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    // Filter by parent
    if (parentId === "null") {
      where.parentCategoryId = null;
    } else if (parentId) {
      where.parentCategoryId = parentId;
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        childCategories: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: true,
            childCategories: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while creating category` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { merchantId, name, parentCategoryId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // For non-admins, require merchantId and validate access
    if (!isAdmin) {
      if (!merchantId) {
        return NextResponse.json(
          { error: "Merchant ID is required" },
          { status: 400 }
        );
      }
      // Check if user has access to this merchant
      if (merchantIds.length > 0 && !merchantIds.some(id => id === merchantId)) {
        return NextResponse.json(
          { error: "Access denied to this merchant" },
          { status: 403 }
        );
      }
    } else {
      // For admins, merchantId is still required but they can use any valid merchant
      if (!merchantId) {
        return NextResponse.json(
          { error: "Please select a merchant for this category" },
          { status: 400 }
        );
      }
    }

    // Check if parent category exists
    if (parentCategoryId) {
      const parentExists = await prisma.productCategory.findUnique({
        where: { id: parentCategoryId },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 404 }
        );
      }
    }

    const category = await prisma.productCategory.create({
      data: {
        merchantId,
        name,
        parentCategoryId,
      },
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Category created successfully",
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { message: "Failed to create category" },
      { status: 500 }
    );
  }
}