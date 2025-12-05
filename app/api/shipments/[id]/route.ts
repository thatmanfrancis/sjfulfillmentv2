import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateShipmentSchema = z.object({
  trackingNumber: z.string().optional(),
  carrierName: z.string().optional(),
  labelUrl: z.string().url().optional(),
  deliveryAttempts: z.number().int().min(1).max(3).optional(),
});

// GET /api/shipments/[id] - Get shipment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        Order: {
          include: {
            Business: { select: { id: true, name: true, baseCurrency: true } },
            Warehouse: { select: { id: true, name: true, region: true } },
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            OrderItem: {
              include: {
                Product: {
                  select: { id: true, name: true, sku: true, weightKg: true },
                },
              },
            },
          },
        },
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
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (
      authResult.user.role === "MERCHANT" ||
      authResult.user.role === "MERCHANT_STAFF"
    ) {
      if (shipment.Order.merchantId !== authResult.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (authResult.user.role === "LOGISTICS") {
      if (shipment.Order.assignedLogisticsId !== authResult.user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Error fetching shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateShipmentSchema.parse(body);

    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        Order: {
          select: {
            id: true,
            merchantId: true,
            assignedLogisticsId: true,
            status: true,
          },
        },
      },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Check if logistics user is assigned to this order
    if (
      authResult.user.role === "LOGISTICS" &&
      existingShipment.Order.assignedLogisticsId !== authResult.user.id
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this order" },
        { status: 403 }
      );
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: validatedData,
      include: {
        Order: {
          include: {
            Business: { select: { id: true, name: true, baseCurrency: true } },
            Warehouse: { select: { id: true, name: true, region: true } },
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            OrderItem: {
              include: {
                Product: { select: { name: true, sku: true, weightKg: true } },
              },
            },
          },
        },
      },
    });

    // Update order status based on delivery attempts
    let orderStatus = existingShipment.Order.status;
    if (validatedData.deliveryAttempts) {
      if (validatedData.deliveryAttempts === 3) {
        // Max attempts reached, mark as returned
        orderStatus = "RETURNED";
        await prisma.order.update({
          where: { id: existingShipment.Order.id },
          data: { status: orderStatus },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Shipment",
        entityId: updatedShipment.id,
        action: "SHIPMENT_UPDATED",
        details: {
          changes: validatedData,
          deliveryAttempts: updatedShipment.deliveryAttempts,
          orderStatus,
        },
        changedById: authResult.user.id,
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json({
      shipment: {
        ...updatedShipment,
        totalItems:
          updatedShipment.Order?.OrderItem?.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          ) || 0,
        totalWeight:
          updatedShipment.Order?.OrderItem?.reduce(
            (sum: number, item: any) =>
              sum + item.Product.weightKg * item.quantity,
            0
          ) || 0,
        daysInTransit: Math.ceil(
          (new Date().getTime() - updatedShipment.lastStatusUpdate.getTime()) /
            (1000 * 3600 * 24)
        ),
        canRetry: updatedShipment.deliveryAttempts < 3,
        orderStatusUpdated: orderStatus !== existingShipment.Order.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        trackingNumber: true,
        deliveryAttempts: true,
      },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Can only delete if no delivery attempts have been made
    if (existingShipment.deliveryAttempts > 1) {
      return NextResponse.json(
        { error: "Cannot delete shipment with delivery attempts" },
        { status: 400 }
      );
    }

    await prisma.shipment.delete({
      where: { id },
    });

    // Reset order status back to previous state
    await prisma.order.update({
      where: { id: existingShipment.orderId },
      data: { status: "AWAITING_ALLOC" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Shipment",
        entityId: id,
        action: "SHIPMENT_DELETED",
        details: {
          orderId: existingShipment.orderId,
          trackingNumber: existingShipment.trackingNumber,
        },
        changedById: authResult.user.id,
        User: { connect: { id: authResult.user.id } },
      },
    });

    return NextResponse.json({ message: "Shipment deleted successfully" });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
