import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { createAuditLog, createNotification } from "@/lib/notifications";

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
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
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
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      where.merchantId = authResult.user.businessId;
    } else if (businessId && authResult.user.role === "ADMIN") {
      where.merchantId = businessId;
    } else if (authResult.user.role === "LOGISTICS") {
      if (assignedToMe) {
        where.assignedLogisticsId = authResult.user.id;
      } else {
        // Show orders in user's assigned warehouse regions
        const userRegions = await prisma.logisticsRegion.findMany({
          where: { userId: authResult.user.id },
          select: {
            warehouseId: true
          }
        });

        const warehouseIds = userRegions.map((ur) => ur.warehouseId);        where.OR = [
          { assignedLogisticsId: authResult.user.id },
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
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { externalOrderId: { contains: search, mode: "insensitive" } },
      ];
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
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  weightKg: true,
                  sku: true
                }
              }
            }
          },
          fulfillmentWarehouse: {
            select: {
              id: true,
              name: true,
              region: true,
            },
          },
          assignedLogistics: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          shipments: {
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
      orders: orders.map(order => ({
        ...order,
        totalWeight: order.items.reduce(
          (sum, item) => sum + (item.product.weightKg * item.quantity),
          0
        ),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueProducts: order.items.length,
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
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only merchants, merchant staff, and admins can create orders
    if (!["MERCHANT", "MERCHANT_STAFF", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Determine merchant ID
    let merchantId: string;
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      if (!authResult.user.businessId) {
        return NextResponse.json(
          { error: "No business associated with user" },
          { status: 400 }
        );
      }
      merchantId = authResult.user.businessId;
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
        stockAllocations: {
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

    // Create order with items
    const order = await prisma.order.create({
      data: {
        merchantId,
        externalOrderId: validatedData.externalOrderId,
        customerName: validatedData.customerName,
        customerAddress: validatedData.customerAddress,
        customerPhone: validatedData.customerPhone,
        orderDate: validatedData.orderDate,
        totalAmount: validatedData.totalAmount,
        items: {
          create: validatedData.items.map(item => ({
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
        items: {
          include: {
            product: {
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
      authResult.user.id,
      "Order",
      order.id,
      "ORDER_CREATED",
      {
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
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
      totalWeight: order.items.reduce(
        (sum, item) => sum + (item.product.weightKg * item.quantity),
        0
      ),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueProducts: order.items.length,
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