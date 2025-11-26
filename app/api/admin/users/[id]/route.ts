import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MERCHANT', 'MERCHANT_STAFF', 'LOGISTICS']).optional(),
  businessId: z.string().uuid().optional().nullable(),
  isVerified: z.boolean().optional(), // Changed from isActive to isVerified
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can view user details
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can access user details" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Get user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Business_User_businessIdToBusiness: {
          select: {
            id: true,
            name: true,
            contactPhone: true,
            address: true,
            city: true,
            state: true,
          },
        },
        // logistics regions disabled until schema is fixed
        // Recent activity via audit logs
        AuditLog: {
          select: {
            id: true,
            entityType: true,
            action: true,
            timestamp: true,
            details: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get additional statistics based on role
    let roleSpecificData: any = {};

    if (user.role === "MERCHANT" || user.role === "MERCHANT_STAFF") {
      if (user.businessId) {
        roleSpecificData = {
          businessStats: {
            totalOrders: await prisma.order.count({
              where: { merchantId: user.businessId },
            }),
            totalProducts: await prisma.product.count({
              where: { businessId: user.businessId },
            }),
            pendingOrders: await prisma.order.count({
              where: {
                merchantId: user.businessId,
                status: { in: ['NEW', 'AWAITING_ALLOC'] },
              },
            }),
          },
        };
      }
    } else if (user.role === "LOGISTICS") {
      // const assignedWarehouses = user.regions.map(lr => lr.warehouseId);
      // Disabled until logistics regions are properly configured
      const assignedWarehouses: string[] = [];
      
      roleSpecificData = {
        logisticsStats: {
            assignedWarehouses: assignedWarehouses.length,
            activeOrders: await prisma.order.count({
              where: {
                fulfillmentWarehouseId: { in: assignedWarehouses },
                status: { in: ['GOING_TO_PICKUP', 'PICKED_UP', 'DELIVERING'] },
              },
            }),
            completedDeliveries: await prisma.order.count({
              where: {
                fulfillmentWarehouseId: { in: assignedWarehouses },
                status: 'DELIVERED',
                orderDate: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
              },
            }),
          },
      };
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      ...safeUser,
      ...roleSpecificData,
    });

  } catch (error) {
    console.error("Error fetching user:", error);
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
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can update users
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update users" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        businessId: true,
        isVerified: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from deactivating themselves
    if (userId === session.userId && validatedData.isVerified === false) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Check email uniqueness if email is being changed
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Validate business association if provided
    if (validatedData.businessId) {
      const business = await prisma.business.findUnique({
        where: { id: validatedData.businessId },
        select: { id: true, name: true },
      });

      if (!business) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
    }

    // Handle role changes that affect business association
    if (validatedData.role && 
        (validatedData.role === "ADMIN" || validatedData.role === "LOGISTICS") &&
        (existingUser.role === "MERCHANT" || existingUser.role === "MERCHANT_STAFF")) {
      // Changing from business roles to non-business roles
      validatedData.businessId = null;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        isVerified: validatedData.email !== existingUser.email ? false : undefined,
      },
      include: {
        Business_User_businessIdToBusiness: {
          select: {
            id: true,
            name: true,
            contactPhone: true,
            address: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "User",
        entityId: userId,
        action: "UPDATE",
        details: {
          previousValues: {
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            email: existingUser.email,
            role: existingUser.role,
            businessId: existingUser.businessId,
            isVerified: existingUser.isVerified,
          },
          newValues: validatedData,
          changedFields: Object.keys(validatedData),
        },
        changedById: session.userId,
        timestamp: new Date(),
        User: { connect: { id: session.userId } },
      },
    });

    // Remove sensitive data
    const { passwordHash, ...safeUser } = updatedUser;

    return NextResponse.json(safeUser);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (same as PUT for compatibility)
export const PATCH = PUT;

// DELETE /api/admin/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can delete users
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete users" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Prevent admin from deleting themselves
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
        businessId: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!existingUser.isVerified) {
      return NextResponse.json(
        { error: "User is not verified" },
        { status: 400 }
      );
    }

    // Check for active dependencies
    const dependencies: string[] = [];

    // Check for recent orders/activities based on role
    if (existingUser.role === "LOGISTICS") {
      const activeAssignments = await prisma.order.count({
        where: {
          assignedLogisticsId: userId,
          status: { in: ['GOING_TO_PICKUP', 'PICKED_UP', 'DELIVERING'] },
        },
      });
      
      if (activeAssignments > 0) {
        dependencies.push(`${activeAssignments} active order assignments`);
      }
    }

    if (dependencies.length > 0) {
      return NextResponse.json({
        error: "Cannot deactivate user with active dependencies",
        dependencies,
        suggestion: "Reassign active orders/responsibilities before deactivating",
      }, { status: 409 });
    }

    // Deactivate the user (soft delete)
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "User",
        entityId: userId,
        action: "DEACTIVATE",
        details: {
          deactivatedUser: existingUser,
        },
        changedById: session.userId,
        timestamp: new Date(),
        User: { connect: { id: session.userId } },
      },
    });

    return NextResponse.json({
      message: "User deactivated successfully",
      user: deactivatedUser,
    });

  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}