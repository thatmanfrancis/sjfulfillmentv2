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

// Generate warehouse code based on region
function generateWarehouseCode(
  region: string,
  existingCodes: string[]
): string {
  // Extract first 2 letters of region and make uppercase
  const prefix = region.slice(0, 2).toUpperCase();

  // Find existing codes with same prefix
  const existingNumbers = existingCodes
    .filter((code) => code.startsWith(prefix))
    .map((code) => {
      const num = parseInt(code.split("-")[1] || "0");
      return isNaN(num) ? 0 : num;
    })
    .sort((a, b) => a - b);

  // Find next available number
  let nextNumber = 1;
  for (const num of existingNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(2, "0")}`;
}

// GET /api/warehouses - List warehouses
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
          warehouseId: true,
        },
      });

      const warehouseIds = userRegions.map((ur) => ur.warehouseId);
      where.id = {
        in: warehouseIds,
      };
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        StockAllocation: includeStats
          ? {
              select: {
                allocatedQuantity: true,
              },
            }
          : undefined,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      warehouses: warehouses.map((warehouse: any) => ({
        ...warehouse,
        stats: includeStats
          ? {
              totalProducts: warehouse.StockAllocation?.length || 0,
              totalStock:
                warehouse.StockAllocation?.reduce(
                  (sum: number, allocation: any) =>
                    sum + allocation.allocatedQuantity,
                  0
                ) || 0,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow both admins and logistics users to create warehouses
    if (!["ADMIN", "LOGISTICS"].includes(authResult.user.role)) {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Admin or Logistics access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createWarehouseSchema.parse(body);

    // Generate unique warehouse code
    const existingWarehouses = await prisma.warehouse.findMany({
      select: { code: true },
    });
    const existingCodes = existingWarehouses
      .map((w) => w.code)
      .filter((code): code is string => code !== null);
    const warehouseCode = generateWarehouseCode(
      validatedData.region,
      existingCodes
    );

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
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        code: warehouseCode,
        updatedAt: new Date(),
      },
      include: {
        StockAllocation: true,
        LogisticsRegion: {
          select: {
            id: true,
            User: {
              select: { id: true, firstName: true, lastName: true },
            },
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
