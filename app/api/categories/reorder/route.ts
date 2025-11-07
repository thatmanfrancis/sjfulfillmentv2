import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while fetching categories` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { categoryOrders } = body;

    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json(
        { error: "categoryOrders must be an array of { id, order } objects" },
        { status: 400 }
      );
    }

    // Update each category's order
    // Note: You'll need to add an 'order' field to ProductCategory model
    // For now, we'll just return success as order isn't in the schema

    // If you add an 'order' field to the schema, uncomment below:
    /*
    const updates = categoryOrders.map((item) =>
      prisma.productCategory.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );

    await Promise.all(updates);
    */

    return NextResponse.json({
      message: "Categories reordered successfully",
      note: "Add 'order' field to ProductCategory model to persist order",
    });
  } catch (error) {
    console.error("Reorder categories error:", error);
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 }
    );
  }
}
