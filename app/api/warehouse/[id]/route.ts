import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching warehouse` }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        address: true,
        _count: {
          select: {
            inventory: true,
            orders: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error("Get warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while updating warehouse` }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const {
      name,
      code,
      addressId,
      managerUserId,
      capacity,
      operatingHours,
      isShared,
    } = body;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // If code is changing, check for duplicates
    if (code && code !== warehouse.code) {
      const duplicate = await prisma.warehouse.findUnique({
        where: { code },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Warehouse with this code already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(addressId !== undefined && { addressId }),
        ...(managerUserId !== undefined && { managerUserId }),
        ...(capacity !== undefined && { capacity }),
        ...(operatingHours !== undefined && { operatingHours }),
        ...(isShared !== undefined && { isShared }),
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Warehouse updated successfully",
      warehouse: updated,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while deleting warehouse` }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            inventory: true,
            orders: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check if warehouse has inventory
    if (warehouse._count.inventory > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete warehouse. ${warehouse._count.inventory} inventory record(s) exist.`,
        },
        { status: 400 }
      );
    }

    // Check if warehouse has orders
    if (warehouse._count.orders > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete warehouse. ${warehouse._count.orders} order(s) are assigned to this warehouse.`,
        },
        { status: 400 }
      );
    }

    await prisma.warehouse.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 }
    );
  }
}