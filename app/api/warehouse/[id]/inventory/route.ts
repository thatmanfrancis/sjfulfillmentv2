import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching warehouse inventory` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const lowStock = searchParams.get("lowStock") === "true";

    const skip = (page - 1) * limit;

    const where: any = {
      warehouseId: id,
    };

    if (lowStock) {
      where.quantityAvailable = {
        lte: prisma.inventory.fields.reorderPoint,
      };
      where.reorderPoint = { not: null };
    }

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
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
      }),
      prisma.inventory.count({ where }),
    ]);

    return NextResponse.json({
      inventory,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get warehouse inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse inventory" },
      { status: 500 }
    );
  }
}
