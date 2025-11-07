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

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        trackingNumber,
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

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PROCESSING" },
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
