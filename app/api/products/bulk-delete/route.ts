import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while deleting products` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { productIds } = body;

    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      );
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    return NextResponse.json({
      message: `${result.count} products deleted successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}
