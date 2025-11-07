import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while updating products` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { productIds, updates } = body;

    if (!Array.isArray(productIds) || !updates) {
      return NextResponse.json(
        { error: "Product IDs array and updates object are required" },
        { status: 400 }
      );
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data: updates,
    });

    return NextResponse.json({
      message: `${result.count} products updated successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to update products" },
      { status: 500 }
    );
  }
}
