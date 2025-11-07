import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching warehouses` }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const merchantId = searchParams.get("merchantId");
    const isShared = searchParams.get("isShared");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (isShared !== null && isShared !== undefined) {
      where.isShared = isShared === "true";
    }

    // Filter by merchant
    if (merchantId) {
      where.OR = [{ merchantId }, { isShared: true }];
    } else if (!isAdmin) {
      where.OR = [{ merchantId: { in: merchantIds } }, { isShared: true }];
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { name: "asc" },
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

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("Get warehouses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating warehouse` }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      name,
      code,
      addressId,
      managerUserId,
      capacity,
      operatingHours,
      isShared,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse with this code already exists" },
        { status: 409 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        merchantId,
        name,
        code,
        addressId,
        managerUserId,
        capacity,
        operatingHours,
        isShared: isShared || false,
        status: "ACTIVE",
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
        address: true,
      },
    });

    return NextResponse.json(
      {
        message: "Warehouse created successfully",
        warehouse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create warehouse error:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
