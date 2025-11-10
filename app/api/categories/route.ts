
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
    const parentId = searchParams.get("parentId");

    // We no longer tie categories to merchants. Return categories optionally
    // filtered by parentCategoryId. Authentication is still required.
    const where: any = {};

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
  const { name, parentCategoryId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Only admins are allowed to create global categories
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can create categories" }, { status: 403 });
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