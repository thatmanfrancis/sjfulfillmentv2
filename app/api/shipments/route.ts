import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const carrier = searchParams.get("carrier");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    // Filter by merchant through order
    if (!isAdmin) {
      where.order = { merchantId: { in: merchantIds } };
    }

    if (status) {
      where.status = status;
    }

    if (carrier) {
      where.carrier = carrier;
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      shipments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get shipments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}



export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { isAdmin, userRole } = await getUserMerchantContext(auth.userId as string);

    // Only admins or warehouse/logistics personnel can create shipments
    const allowed = isAdmin || userRole === "WAREHOUSE_MANAGER" || userRole === "LOGISTICS_PERSONNEL";
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      orderId,
      trackingNumber,
      carrier,
      serviceLevel,
      weight,
      dimensions,
      shippingCost,
      estimatedDeliveryDate,
      signatureRequired,
    } = body;

    // Allow callers to provide either orderId or orderNumber
    let resolvedOrderId = orderId;
    if (!resolvedOrderId && (body.orderNumber || body.orderNo)) {
      const on = body.orderNumber || body.orderNo;
      const found = await prisma.order.findFirst({ where: { orderNumber: on } });
      if (found) resolvedOrderId = found.id;
    }

    if (!resolvedOrderId) {
      return NextResponse.json(
        { error: "Order ID or orderNumber is required" },
        { status: 400 }
      );
    }

    // Ensure the referenced order exists
    const existingOrder = await prisma.order.findUnique({ where: { id: resolvedOrderId } });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    // Prevent creating shipments for orders in invalid final states
    const invalidStatuses = ["CANCELLED", "DELIVERED", "RETURNED", "VOID"];
    if (invalidStatuses.includes((existingOrder.status || "").toString().toUpperCase())) {
      return NextResponse.json({ error: `Cannot create shipment for order with status ${existingOrder.status}` }, { status: 400 });
    }

    // Generate a tracking number if one wasn't provided
    const finalTrackingNumber = trackingNumber && String(trackingNumber).trim().length > 0
      ? String(trackingNumber)
      : `TRK-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

    // Create shipment and update order status inside a transaction for consistency
    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId: resolvedOrderId,
          trackingNumber: finalTrackingNumber,
          carrier,
          serviceLevel,
          weight,
          dimensions,
          shippingCost,
          estimatedDeliveryDate,
          signatureRequired: signatureRequired || false,
          status: "LABEL_CREATED",
        },
      });

      await tx.order.update({
        where: { id: resolvedOrderId },
        data: { status: "PROCESSING" },
      });

      return created;
    });

    return NextResponse.json(
      {
        message: "Shipment created successfully",
        shipment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create shipment error:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
