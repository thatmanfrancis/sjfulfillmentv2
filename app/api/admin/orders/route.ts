import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { externalOrderId: { contains: search, mode: "insensitive" } },
        { Business: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      const statusList = status.split(",");
      where.status = { in: statusList };
    }

    // Get orders with related data
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          externalOrderId: true,
          customerName: true,
          customerAddress: true,
          customerPhone: true,
          orderDate: true,
          status: true,
          totalAmount: true,
          notes: true,
          priceTierGroupId: true,
          priceTierBreakdown: true,
          Note: {
            include: {
              Author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          Business: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              country: true,
              baseCurrency: true,
            },
          },
          OrderItem: {
            select: {
              id: true,
              quantity: true,
              productId: true,
              Product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          User: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          Warehouse: {
            select: {
              name: true,
              region: true,
            },
          },
        },
        orderBy: { orderDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Map OrderItem to items for frontend compatibility
    const mappedOrders = orders.map((order: any) => {
      const mappedItems =
        order.OrderItem?.map((item: any) => {
          // Always use Product.id if available, fallback to item.productId
          const pid = item.Product?.id || item.productId;
          return {
            id: item.id,
            quantity: item.quantity,
            productId: pid,
            product: {
              id: pid,
              name: item.Product?.name || "",
              sku: item.Product?.sku || "",
            },
          };
        }) || [];
      return {
        ...order,
        business: order.Business
          ? {
              id: order.Business.id,
              name: order.Business.name,
              address: order.Business.address,
              city: order.Business.city,
              state: order.Business.state,
              country: order.Business.country,
              baseCurrency: order.Business.baseCurrency,
            }
          : undefined,
        note: order.notes || "",
        notes: order.Note || [],
        items: mappedItems,
        priceTierGroupId: order.priceTierGroupId,
        priceTierBreakdown: order.priceTierBreakdown,
      };
    });

    return NextResponse.json({
      orders: mappedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
