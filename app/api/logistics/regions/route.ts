import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and LOGISTICS users can access this
    if (!["ADMIN", "LOGISTICS"].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let regions;
    
    if (authResult.user.role === "ADMIN") {
      // Admin can see all logistics regions
      regions = await prisma.logisticsRegion.findMany({
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          Warehouse: {
            select: {
              id: true,
              name: true,
              region: true
            }
          }
        }
      });
    } else {
      // Logistics users can only see their own regions
      regions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        include: {
          Warehouse: {
            select: {
              id: true,
              name: true,
              region: true
            }
          }
        }
      });
    }

    return NextResponse.json({ regions });
  } catch (error) {
    console.error("Logistics regions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logistics regions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN can create logistics region assignments
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can assign logistics regions" },
        { status: 403 }
      );
    }

    const { userId, warehouseId } = await request.json();

    if (!userId || !warehouseId) {
      return NextResponse.json(
        { error: "userId and warehouseId are required" },
        { status: 400 }
      );
    }

    // Verify user exists and has LOGISTICS role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "LOGISTICS") {
      return NextResponse.json(
        { error: "User must have LOGISTICS role" },
        { status: 400 }
      );
    }

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, region: true }
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Create logistics region assignment (include required id field)
    const { randomUUID } = await import('crypto');
    const logisticsRegion = await prisma.logisticsRegion.create({
      data: {
        id: randomUUID(),
        userId,
        warehouseId,
        User: {
          connect: { id: userId }
        },
        Warehouse: {
          connect: { id: warehouseId }
        }
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        Warehouse: {
          select: {
            id: true,
            name: true,
            region: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      logisticsRegion,
      message: `Successfully assigned ${user.firstName} ${user.lastName} to ${warehouse.name} warehouse`
    });
  } catch (error: any) {
    console.error("Logistics region creation error:", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "This user is already assigned to this warehouse" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create logistics region assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN can delete logistics region assignments
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can remove logistics region assignments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('id');
    const userId = searchParams.get('userId');
    const warehouseId = searchParams.get('warehouseId');

    if (!regionId && (!userId || !warehouseId)) {
      return NextResponse.json(
        { error: "Either regionId or both userId and warehouseId are required" },
        { status: 400 }
      );
    }

    let deleteCondition: any;
    
    if (regionId) {
      deleteCondition = { id: regionId };
    } else {
      deleteCondition = { userId, warehouseId };
    }

    // Get the assignment before deleting for the response
    const assignment = await prisma.logisticsRegion.findFirst({
      where: deleteCondition,
      include: {
        User: {
          select: { firstName: true, lastName: true }
        },
        Warehouse: {
          select: { name: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Logistics region assignment not found" },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.logisticsRegion.delete({
      where: { id: assignment.id }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${assignment.User.firstName} ${assignment.User.lastName} from ${assignment.Warehouse.name} warehouse`
    });
  } catch (error) {
    console.error("Logistics region deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete logistics region assignment" },
      { status: 500 }
    );
  }
}