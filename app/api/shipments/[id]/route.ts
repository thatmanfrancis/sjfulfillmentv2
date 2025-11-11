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
    return NextResponse.json(
      { message: `Error occurred while fetching shipment` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(
      auth.userId as string
    );
    const shipment = await prisma.shipment.findUnique({
      where: { id: id },
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            warehouse: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: "desc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Authorization: admins always allowed. Merchants that own the order allowed.
    if (!isAdmin) {
      // Warehouse managers can access shipments for warehouses they manage only
      if (userRole === "WAREHOUSE_MANAGER") {
  const managed = await prisma.warehouse.findMany({ where: { managerUserId: auth.userId as string } });
        const managedIds = managed.map((w) => w.id);
        const orderWarehouseId = shipment.order?.warehouse?.id || shipment.order?.warehouseId;
        if (!orderWarehouseId || !managedIds.includes(orderWarehouseId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        // regular merchant staff: verify order.merchantId
        const orderMerchantId = shipment.order?.merchantId;
        if (!orderMerchantId || !(merchantIds || []).includes(orderMerchantId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("Get shipment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipment" },
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
    return NextResponse.json(
      { message: `Error occurred while updating shipment` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const { isAdmin, userRole, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );
    const body = await req.json();
    const { trackingNumber, carrier, serviceLevel, estimatedDeliveryDate } =
      body;

    // Only admins or warehouse/logistics personnel can update shipments
    const allowed = isAdmin || userRole === "WAREHOUSE_MANAGER" || userRole === "LOGISTICS_PERSONNEL";
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const shipment = await prisma.shipment.update({
      where: { id: id },
      data: {
        ...(trackingNumber && { trackingNumber }),
        ...(carrier && { carrier }),
        ...(serviceLevel && { serviceLevel }),
        ...(estimatedDeliveryDate && { estimatedDeliveryDate }),
      },
    });

    return NextResponse.json({
      message: "Shipment updated successfully",
      shipment,
    });
  } catch (error) {
    console.error("Update shipment error:", error);
    return NextResponse.json(
      { error: "Failed to update shipment" },
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
    return NextResponse.json({ message: `Error occurred while deleting shipment` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { isAdmin, userRole } = await getUserMerchantContext(
      auth.userId as string
    );

    // Only admins or warehouse managers may delete shipments
    const allowed = isAdmin || userRole === "WAREHOUSE_MANAGER" || userRole === "LOGISTICS_PERSONNEL";
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.shipment.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: "Shipment deleted successfully",
    });
  } catch (error) {
    console.error("Delete shipment error:", error);
    return NextResponse.json(
      { error: "Failed to delete shipment" },
      { status: 500 }
    );
  }
}
