import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get merchant's businessId and currency from User -> Business
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });
    const businessId = user?.businessId;
    if (!businessId) {
      return NextResponse.json({ inventory: [], stats: null, currency: null });
    }
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { baseCurrency: true },
    });
    const currency = business?.baseCurrency || "USD";
    const baseCurrency = business?.baseCurrency || "USD";
    // Fetch inventory items for this business
    const products = await prisma.product.findMany({
      where: { businessId },
      select: {
        id: true,
        sku: true,
        name: true,
        initialQuantity: true,
        price: true,
        weightKg: true,
        dimensions: true,
        imageUrl: true,
        ProductImage: { select: { imageUrl: true, altText: true } },
        StockAllocation: true,
      },
    });
    // Calculate stats
    const totalValue = products.reduce(
      (sum, p) => sum + (p.price ?? 0) * (p.initialQuantity ?? 0),
      0
    );
    const lowStockItems = products.filter(
      (p) => (p.initialQuantity ?? 0) < 10
    ).length;
    const outOfStockItems = products.filter(
      (p) => (p.initialQuantity ?? 0) === 0
    ).length;
    return NextResponse.json({
      inventory: products,
      stats: {
        totalValue,
        lowStockItems,
        outOfStockItems,
      },
      currency,
      baseCurrency,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
