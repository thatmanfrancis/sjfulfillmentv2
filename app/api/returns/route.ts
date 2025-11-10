import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching returns` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");

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

    if (reason) {
      where.reason = reason;
    }

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
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
          processor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.return.count({ where }),
    ]);

    return NextResponse.json({
      returns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get returns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while initializing return` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { orderId, reason, customerNotes, returnItems, trackingNumber } =
      body;

    if (!orderId || !reason || !returnItems) {
      return NextResponse.json(
        { error: "Order ID, reason, and return items are required" },
        { status: 400 }
      );
    }

    // Get order to generate return number
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if the user is an admin
    const { isAdmin } = await getUserMerchantContext(auth.userId as string);

    // Generate return number
    const returnCount = await prisma.return.count({
      where: {
        order: { merchantId: order.merchantId },
      },
    });
    const returnNumber = `RET-${order.merchantId
      .slice(0, 8)
      .toUpperCase()}-${String(returnCount + 1).padStart(6, "0")}`;

    // Auto-approve if admin, otherwise set to REQUESTED
    const initialStatus = isAdmin ? "APPROVED" : "REQUESTED";
    const approvedAt = isAdmin ? new Date() : null;
    const processedBy = isAdmin ? auth.userId as string : null;

    const returnRecord = await prisma.return.create({
      data: {
        orderId,
        returnNumber,
        reason,
        customerNotes,
        returnItems,
        trackingNumber,
        status: initialStatus,
        approvedAt,
        processedBy,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        processor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "RETURNED" },
    });

    return NextResponse.json(
      {
        message: isAdmin
          ? "Return created and auto-approved"
          : "Return requested successfully",
        return: returnRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create return error:", error);
    return NextResponse.json(
      { error: "Failed to create return" },
      { status: 500 }
    );
  }
}
