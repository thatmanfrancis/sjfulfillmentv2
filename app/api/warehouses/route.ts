import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/notifications";

const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  region: z.string().min(1).max(100),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

// GET /api/warehouses - List warehouses
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
    const region = searchParams.get("region");
    const includeStats = searchParams.get("includeStats") === "true";

    let where: any = {};
    if (region) {
      where.region = { contains: region, mode: "insensitive" };
    }

    // For logistics users, only show warehouses in their assigned regions
    if (authResult.user.role === "LOGISTICS") {
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: {
          warehouseId: true
        }
      });

      const warehouseIds = userRegions.map((ur) => ur.warehouseId);
      where.id = {
        in: warehouseIds,
      };
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        fulfilledOrders: includeStats
          ? {
              where: {
                status: {
                  in: ["DISPATCHED", "PICKED_UP", "DELIVERING", "DELIVERED"],
                },
              },
              select: { id: true, status: true },
            }
          : undefined,
        LogisticsRegion: {
          select: {
            id: true,
            User: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
        },
        stockAllocations: includeStats ? {
          select: {
            allocatedQuantity: true
          }
        } : undefined,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      warehouses: warehouses.map((warehouse: any) => ({
        ...warehouse,
        stats: includeStats
          ? {
              totalProducts: warehouse.stockAllocations?.length || 0,
              totalStock: warehouse.stockAllocations?.reduce(
                (sum: number, allocation: any) => sum + allocation.allocatedQuantity,
                0
              ) || 0,
              activeOrders: warehouse.fulfilledOrders?.filter(
                (order: any) => order.status !== "DELIVERED"
              ).length || 0,
              assignedLogistics: warehouse.logisticsRegion ? 1 : 0,
            }
          : undefined,
      })),
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/warehouses - Create new warehouse (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can create warehouses
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createWarehouseSchema.parse(body);

    // Check if warehouse with same name in same region exists
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        name: validatedData.name,
        region: validatedData.region,
      },
    });

    if (existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse with this name already exists in the region" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: validatedData,
      include: {
        stockAllocations: true,
        LogisticsRegion: {
          select: {
            id: true,
            User: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      authResult.user.id,
      "Warehouse",
      warehouse.id,
      "WAREHOUSE_CREATED",
      {
        name: warehouse.name,
        region: warehouse.region,
      }
    );

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}