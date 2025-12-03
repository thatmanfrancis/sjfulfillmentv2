import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required").max(200),
  region: z.string().min(1, "Region is required").max(100),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email format").optional(),
  manager: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be greater than 0").optional(),
  type: z
    .enum(["FULFILLMENT", "STORAGE", "DISTRIBUTION", "CROSS_DOCK"])
    .default("STORAGE"),
  description: z.string().optional(),
});

// Generate warehouse code based on region
function generateWarehouseCode(
  region: string,
  existingCodes: string[]
): string {
  const regionPrefix = region.substring(0, 3).toUpperCase();
  let counter = 1;
  let code = `${regionPrefix}${counter.toString().padStart(3, "0")}`;

  while (existingCodes.includes(code)) {
    counter++;
    code = `${regionPrefix}${counter.toString().padStart(3, "0")}`;
  }

  return code;
}

// GET /api/logistics/warehouses - List warehouses for logistics users
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    console.log(
      "🔐 Session:",
      session ? `User ID: ${session.userId}` : "No session"
    );

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is logistics or admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || !["LOGISTICS", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const region = searchParams.get("region") || "";
    const assignedOnly = searchParams.get("assignedOnly") === "true";

    const offset = (page - 1) * limit;

    // Build where clause
    let where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (region) {
      where.region = { contains: region, mode: "insensitive" };
    }

    // For logistics users, filter based on assignedOnly parameter
    if (user.role === "LOGISTICS") {
      if (assignedOnly) {
        // Only show warehouses they're assigned to
        const userWarehouseIds = await prisma.logisticsRegion.findMany({
          where: { userId: session.userId },
          select: { warehouseId: true },
        });

        const warehouseIds = userWarehouseIds.map((uw) => uw.warehouseId);

        if (warehouseIds.length === 0) {
          console.log(
            "⚠️ Logistics user has no warehouse assignments - returning empty list for assigned tab"
          );
          // Return empty result for assigned tab if no assignments
          return NextResponse.json({
            warehouses: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0,
            },
          });
        } else {
          where.id = { in: warehouseIds };
        }
      }
      // If assignedOnly is false, show all warehouses (no additional filtering)
    }
    // Admin users see all warehouses regardless of assignedOnly parameter

    const [warehouses, totalCount] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        include: {
          StockAllocation: {
            select: {
              allocatedQuantity: true,
            },
          },
          Order: {
            select: { id: true },
          },
          LogisticsRegion: {
            include: {
              User: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.warehouse.count({ where }),
    ]);

    console.log(
      `📦 Found ${warehouses.length} warehouses out of ${totalCount} total`
    );
    warehouses.forEach((w) =>
      console.log(`  - ${w.name} (${w.code}) in ${w.region}`)
    );

    // Transform warehouses data
    const warehousesData = warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      region: warehouse.region,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      country: warehouse.country,
      capacity: warehouse.capacity,
      currentStock: warehouse.StockAllocation.reduce(
        (sum, allocation) => sum + allocation.allocatedQuantity,
        0
      ),
      manager: warehouse.manager,
      contactEmail: warehouse.contactEmail,
      contactPhone: warehouse.contactPhone,
      status: warehouse.status || "ACTIVE",
      type: warehouse.type || "STORAGE",
      description: warehouse.description,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
      assignedStaff: warehouse.LogisticsRegion.map((lr) => ({
        id: lr.User.id,
        name: `${lr.User.firstName} ${lr.User.lastName}`,
      })),
      _count: {
        inventoryItems: warehouse.StockAllocation.length,
        fulfillmentOrders: warehouse.Order.length,
        assignedStaff: warehouse.LogisticsRegion.length,
      },
    }));

    const response = {
      success: true,
      warehouses: warehousesData,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
      },
      metadata: {
        totalWarehouses: totalCount,
        userRole: user.role,
        canCreateWarehouses: ["ADMIN", "LOGISTICS"].includes(user.role),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Error fetching logistics warehouses:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/logistics/warehouses - Create warehouse (Logistics + Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is logistics or admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, firstName: true, lastName: true },
    });

    if (!user || !["LOGISTICS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        {
          error:
            "Only logistics staff and administrators can create warehouses",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createWarehouseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

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

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        code: warehouseCode,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    // If created by logistics user, automatically assign them to this warehouse
    if (user.role === "LOGISTICS") {
      await prisma.logisticsRegion.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.userId,
          warehouseId: warehouse.id,
        },
      });
    }

    // Return created warehouse with additional data
    const warehouseWithData = await prisma.warehouse.findUnique({
      where: { id: warehouse.id },
      include: {
        LogisticsRegion: {
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        warehouse: {
          ...warehouseWithData,
          assignedStaff:
            warehouseWithData?.LogisticsRegion.map((lr) => ({
              id: lr.User.id,
              name: `${lr.User.firstName} ${lr.User.lastName}`,
            })) || [],
        },
        message: `Warehouse "${warehouse.name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating warehouse:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
