
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        customer: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        currency: true,
        integration: {
          select: {
            id: true,
            integrationName: true,
            integrationType: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                images: true,
              },
            },
          },
        },
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { changedAt: "desc" },
        },
        shipments: {
          orderBy: { createdAt: "desc" },
        },
        attempts: {
          orderBy: { attemptedAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      shippingAddressId,
      billingAddressId,
      shippingCost,
      discountAmount,
      taxAmount,
      notes,
      internalNotes,
      tags,
      priority,
      warehouseId,
      expectedShipDate,
      customFields,
      statusNote,
    } = body;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const order = await prisma.order.findUnique({
      where: { id: id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check access permissions
    if (!isAdmin && !merchantIds.includes(order.merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only admins can update status fields
    if (!isAdmin && (status || paymentStatus || fulfillmentStatus)) {
      return NextResponse.json(
        { error: "Only administrators can update order status" },
        { status: 403 }
      );
    }

    // Recalculate total if costs changed
    let totalAmount = order.totalAmount;
    if (
      shippingCost !== undefined ||
      discountAmount !== undefined ||
      taxAmount !== undefined
    ) {
      totalAmount =
        order.subtotal +
        (shippingCost ?? order.shippingCost) +
        (taxAmount ?? order.taxAmount) -
        (discountAmount ?? order.discountAmount);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (fulfillmentStatus !== undefined) updateData.fulfillmentStatus = fulfillmentStatus;
    if (shippingAddressId) updateData.shippingAddressId = shippingAddressId;
    if (billingAddressId) updateData.billingAddressId = billingAddressId;
    if (shippingCost !== undefined) updateData.shippingCost = shippingCost;
    if (discountAmount !== undefined) updateData.discountAmount = discountAmount;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
    if (notes !== undefined) updateData.notes = notes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (tags !== undefined) updateData.tags = tags;
    if (priority) updateData.priority = priority;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (expectedShipDate !== undefined) updateData.expectedShipDate = expectedShipDate;
    if (customFields !== undefined) updateData.customFields = customFields;
    updateData.totalAmount = totalAmount;

    const updated = await prisma.order.update({
      where: { id: id },
      data: updateData,
      include: {
        customer: true,
        items: true,
        currency: true,
        shippingAddress: true,
        billingAddress: true,
      },
    });

    // Create status history entry if status changed
    if (status && status !== order.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: order.status,
          newStatus: status,
          changedBy: auth.userId as string,
          notes: statusNote || `Status updated to ${status}`,
        },
      });
    }

    return NextResponse.json({
      message: "Order updated successfully",
      order: updated,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching user authentication` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Can only cancel if not shipped/delivered
    if (["SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot cancel order that has been shipped or delivered" },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: id },
      data: {
        status: "CANCELLED",
        deletedAt: new Date(),
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        oldStatus: order.status,
        newStatus: "CANCELLED",
        changedBy: auth.userId as string,
        notes: "Order cancelled",
      },
    });

    return NextResponse.json({
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}


