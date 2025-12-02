import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get merchant's businessId from User
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { businessId: true },
    });
    let currency = "USD";
    let businessId: string | undefined = user?.businessId ?? undefined;
    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { baseCurrency: true },
      });
      currency = business?.baseCurrency || "USD";
    }

    const sales = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { merchantId: session.userId },
    });
    const orders = await prisma.order.count({
      where: { merchantId: session.userId },
    });
    const products = await prisma.product.count({
      where: businessId ? { businessId } : undefined,
    });
    const conversion = products ? (orders / products) * 100 : 0;
    const salesTrend = await prisma.order.findMany({
      where: { merchantId: session.userId },
      select: { orderDate: true, totalAmount: true },
      orderBy: { orderDate: "asc" },
    });
    const salesChart = salesTrend.map((o) => ({
      date: o.orderDate,
      value: o.totalAmount,
    }));

    const orderVolumeRaw = await prisma.order.groupBy({
      by: ["orderDate"],
      where: { merchantId: session.userId },
      _count: { id: true },
      orderBy: { orderDate: "asc" },
    });
    const orderChart = orderVolumeRaw.map((o) => ({
      date: o.orderDate,
      count: o._count.id,
    }));

    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { Order: { merchantId: session.userId } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    });
    const topProducts = await Promise.all(
      topProductsRaw.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return {
          name: product?.name || "Unknown",
          count: item._count.productId,
        };
      })
    );

    const customerGrowthRaw = await prisma.order.groupBy({
      by: ["orderDate"],
      where: { merchantId: session.userId },
      _count: { customerName: true },
      orderBy: { orderDate: "asc" },
    });
    const customerChart = customerGrowthRaw.map((o) => ({
      date: o.orderDate,
      count: o._count.customerName,
    }));

    return NextResponse.json({
      sales: { current: sales._sum.totalAmount || 0, previous: 0, change: 0 },
      orders: { current: orders, previous: 0, change: 0 },
      products: { current: products, previous: 0, change: 0 },
      conversion: { current: conversion, previous: 0, change: 0 },
      currency,
      charts: {
        sales: salesChart,
        orders: orderChart,
        topProducts,
        customerGrowth: customerChart,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
