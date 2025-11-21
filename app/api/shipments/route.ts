import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().optional(),
  carrierName: z.string().optional(),
  labelUrl: z.string().url().optional(),
});

const updateShipmentSchema = z.object({
  trackingNumber: z.string().optional(),
  carrierName: z.string().optional(),
  labelUrl: z.string().url().optional(),
  deliveryAttempts: z.number().int().min(1).max(3).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const orderId = searchParams.get("orderId");
    const trackingNumber = searchParams.get("trackingNumber");

    const skip = (page - 1) * limit;

    // Build where clause based on user role and filters
    let where: any = {};
    
    if (orderId) where.orderId = orderId;
    if (trackingNumber) where.trackingNumber = { contains: trackingNumber };

    // Role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      where.Order = {
        merchantId: authResult.user.businessId,
      };
    } else if (authResult.user.role === "LOGISTICS") {
      where.Order = {
        assignedLogisticsId: authResult.user.id,
      };
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastStatusUpdate: "desc" },
        include: {
          Order: {
            include: {
              Business: { select: { id: true, name: true } },
              OrderItem: {
                include: {
                  Product: { select: { weightKg: true, name: true } }
                }
              },
              User: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      shipments: shipments.map(shipment => ({
        ...shipment,
        totalItems: shipment.Order?.OrderItem?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        totalWeight: shipment.Order?.OrderItem?.reduce((sum, item) => sum + ((item.Product?.weightKg || 0) * item.quantity), 0) || 0,
        daysInTransit: shipment.lastStatusUpdate ? Math.ceil((new Date().getTime() - new Date(shipment.lastStatusUpdate).getTime()) / (1000 * 3600 * 24)) : 0,
        canRetry: shipment.deliveryAttempts < 3,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalShipments: total,
      },
    });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createShipmentSchema.parse(body);

    // Verify order exists and check permissions
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        Business: { select: { id: true, name: true } },
        User: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if logistics user is assigned to this order
    if (authResult.user.role === "LOGISTICS" && order.assignedLogisticsId !== authResult.user.id) {
      return NextResponse.json(
        { error: "You are not assigned to this order" },
        { status: 403 }
      );
    }

    // Check if shipment already exists for this order
    const existingShipment = await prisma.shipment.findUnique({
      where: { orderId: validatedData.orderId },
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: "Shipment already exists for this order" },
        { status: 409 }
      );
    }

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        id: crypto.randomUUID(),
        orderId: validatedData.orderId,
        trackingNumber: validatedData.trackingNumber,
        carrierName: validatedData.carrierName,
        labelUrl: validatedData.labelUrl,
        lastStatusUpdate: new Date(),
      },
      include: {
        Order: {
          include: {
            Business: { select: { id: true, name: true } },
            User: { select: { id: true, firstName: true, lastName: true } },
            OrderItem: {
              include: {
                Product: { select: { name: true, weightKg: true } },
              },
            },
          },
        },
      },
    });

    // Update order status to DISPATCHED
    await prisma.order.update({
      where: { id: validatedData.orderId },
      data: { status: "DISPATCHED" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Shipment",
        entityId: shipment.id,
        action: "SHIPMENT_CREATED",
        details: {
          orderId: shipment.orderId,
          trackingNumber: shipment.trackingNumber,
          carrierName: shipment.carrierName,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      shipment: {
        ...shipment,
        totalItems: shipment.Order?.OrderItem?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        totalWeight: shipment.Order?.OrderItem?.reduce((sum: number, item: any) => sum + ((item.Product?.weightKg || 0) * item.quantity), 0) || 0,
        daysInTransit: 0,
        canRetry: true,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}