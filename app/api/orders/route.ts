import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createAuditLog, createNotification } from "@/lib/notifications";
import { generateUniqueTrackingNumber } from "@/lib/tracking";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  externalOrderId: z.string().optional(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().optional(),
  customerAddress: z.string().min(1).max(500),
  customerPhone: z.string().min(1).max(50),
  orderDate: z.string().transform((str) => new Date(str)),
  totalAmount: z.number().positive(),
  items: z.array(orderItemSchema).min(1),
});

const updateOrderSchema = z.object({
  customerName: z.string().min(1).max(200).optional(),
  customerAddress: z.string().min(1).max(500).optional(),
  customerPhone: z.string().min(1).max(50).optional(),
  totalAmount: z.number().positive().optional(),
  items: z.array(orderItemSchema).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

// GET /api/orders - List orders with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        businessId: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const businessId = searchParams.get("businessId");
    const assignedToMe = searchParams.get("assignedToMe") === "true";
    const warehouseId = searchParams.get("warehouseId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause based on user role and filters
    let where: any = {};

    // Role-based filtering
    if (user.role === "MERCHANT" || user.role === "MERCHANT_STAFF") {
      where.merchantId = user.businessId;
    } else if (businessId && user.role === "ADMIN") {
      where.merchantId = businessId;
    } else if (user.role === "LOGISTICS") {
      if (assignedToMe) {
        where.assignedLogisticsId = user.id;
      } else {
        // Show orders in user's assigned warehouse regions
        const userRegions = await prisma.logisticsRegion.findMany({
          where: { userId: user.id },
          select: {
            warehouseId: true
          }
        });

        const warehouseIds = userRegions.map((ur) => ur.warehouseId);
        where.OR = [
            { assignedLogisticsId: user.id },
          {
            fulfillmentWarehouseId: {
              in: warehouseIds,
            },
          },
        ];
      }
    }

    // Additional filters
    if (status) {
      where.status = status;
    }

    if (warehouseId) {
      where.fulfillmentWarehouseId = warehouseId;
    }

    if (search) {
      const searchConditions = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { externalOrderId: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        // If OR already exists (logistics filtering), combine with AND
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          Business: {
            select: {
              id: true,
              name: true,
              baseCurrency: true,
            },
          },
          OrderItem: {
            include: {
              Product: {
                select: {
                  name: true,
                  weightKg: true,
                  sku: true
                }
              }
            }
          },
          Warehouse: {
            select: {
              id: true,
              name: true,
              region: true,
            },
          },
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Shipment: {
            select: {
              id: true,
              trackingNumber: true,
              carrierName: true,
              lastStatusUpdate: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { orderDate: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map((order: any) => ({
        ...order,
        totalWeight: order.OrderItem.reduce(
          (sum: any, item: any) => sum + (item.Product.weightKg * item.quantity),
          0
        ),
        itemCount: order.OrderItem.reduce((sum: any, item: any) => sum + item.quantity, 0),
        uniqueProducts: order.OrderItem.length,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        businessId: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Only merchants, merchant staff, and admins can create orders
    if (!["MERCHANT", "MERCHANT_STAFF", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Determine merchant ID
    let merchantId: string;
    if (user.role === "MERCHANT" || user.role === "MERCHANT_STAFF") {
      if (!user.businessId) {
        return NextResponse.json(
          { error: "No business associated with user" },
          { status: 400 }
        );
      }
      merchantId = user.businessId;
    } else {
      // Admin can specify merchantId in the request
      if (!body.merchantId) {
        return NextResponse.json(
          { error: "merchantId is required for admin users" },
          { status: 400 }
        );
      }
      merchantId = body.merchantId;
    }

    // Validate all products exist and belong to the merchant
    const productIds = validatedData.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: merchantId,
      },
      include: {
        StockAllocation: {
          select: {
            warehouseId: true,
            allocatedQuantity: true,
            safetyStock: true,
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products not found or don't belong to the merchant" },
        { status: 400 }
      );
    }

    // Check if external order ID is unique for this merchant
    if (validatedData.externalOrderId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          merchantId,
          externalOrderId: validatedData.externalOrderId,
        },
      });

      if (existingOrder) {
        return NextResponse.json(
          { error: "Order with this external ID already exists" },
          { status: 400 }
        );
      }
    }

    // Generate unique tracking number
    const trackingNumber = await generateUniqueTrackingNumber();

    // Create order with items
    const order = await prisma.order.create({
      data: {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        trackingNumber: trackingNumber,
        merchantId,
        externalOrderId: validatedData.externalOrderId,
        customerName: validatedData.customerName,
        customerAddress: validatedData.customerAddress,
        customerPhone: validatedData.customerPhone,
        orderDate: validatedData.orderDate,
        totalAmount: validatedData.totalAmount,
        OrderItem: {
          create: validatedData.items.map(item => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                sku: true,
                name: true,
                weightKg: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      user.id,
      "Order",
      order.id,
      "ORDER_CREATED",
      {
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        itemCount: order.OrderItem.length,
        externalOrderId: order.externalOrderId,
      }
    );

    // Notify admin about new order
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of adminUsers) {
      await createNotification(
        admin.id,
        `New order #${order.id} created by ${order.Business.name}`,
        `/admin/orders/${order.id}`,
        "ORDER_DISPATCHED", // Using closest template available
        {
          orderId: order.id,
          merchantName: order.Business.name,
          customerName: order.customerName
        }
      );
    }

    return NextResponse.json({
      ...order,
      totalWeight: order.OrderItem.reduce(
        (sum: number, item: any) => sum + (item.Product.weightKg * item.quantity),
        0
      ),
      itemCount: order.OrderItem.reduce((sum: number, item: any) => sum + item.quantity, 0),
      uniqueProducts: order.OrderItem.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}