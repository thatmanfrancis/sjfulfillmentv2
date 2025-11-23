import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

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
    const businessId = authResult.user.businessId;
    const totalProducts = await prisma.product.count({ where: { businessId } });
    const totalStock = await prisma.stockAllocation.aggregate({
      _sum: { allocatedQuantity: true },
      where: { Product: { businessId } },
    });
    return NextResponse.json({
      totalProducts,
      totalStock: totalStock._sum.allocatedQuantity ?? 0,
    });
  } catch (error) {
    console.error("Error fetching product stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
