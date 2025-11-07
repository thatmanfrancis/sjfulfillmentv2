import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching category` }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const category = await prisma.productCategory.findUnique({
      where: { id },
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
        merchant: {
          select: {
            id: true,
            businessName: true,
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

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Get category error:", error);
    return NextResponse.json(
      { message: "Failed to fetch category" },
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
    return NextResponse.json({ message: `Error occured while fetching category` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, parentCategoryId } = body;

    const category = await prisma.productCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Validate parent category
    if (parentCategoryId) {
      // Can't set self as parent
      if (parentCategoryId === id) {
        return NextResponse.json(
          { error: "Category cannot be its own parent" },
          { status: 400 }
        );
      }

      // Check if parent exists
      const parentExists = await prisma.productCategory.findUnique({
        where: { id: parentCategoryId },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 404 }
        );
      }

      // Prevent circular references
      const wouldCreateCircle = await checkCircularReference(
        id,
        parentCategoryId
      );

      if (wouldCreateCircle) {
        return NextResponse.json(
          { error: "This would create a circular reference" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(parentCategoryId !== undefined && { parentCategoryId }),
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

    return NextResponse.json({
      message: "Category updated successfully",
      category: updated,
    });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// Helper function to check circular references
async function checkCircularReference(
  categoryId: string,
  potentialParentId: string
): Promise<boolean> {
  let currentId: string | null = potentialParentId;

  while (currentId) {
    if (currentId === categoryId) {
      return true; // Circular reference detected
    }

    const parent: any = await prisma.productCategory.findUnique({
      where: { id: currentId },
      select: { parentCategoryId: true },
    });

    currentId = parent?.parentCategoryId || null;
  }

  return false;
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching category` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            childCategories: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has products
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. ${category._count.products} product(s) are assigned to this category.`,
        },
        { status: 400 }
      );
    }

    // Check if category has child categories
    if (category._count.childCategories > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. ${category._count.childCategories} subcategory(ies) exist under this category.`,
        },
        { status: 400 }
      );
    }

    await prisma.productCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { message: "Failed to delete category" },
      { status: 500 }
    );
  }
}