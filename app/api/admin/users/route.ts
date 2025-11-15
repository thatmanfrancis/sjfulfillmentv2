import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Validation schemas
const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MERCHANT', 'MERCHANT_STAFF', 'LOGISTICS']).optional(),
  businessId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

const userCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MERCHANT', 'MERCHANT_STAFF', 'LOGISTICS']),
  businessId: z.string().uuid().optional().nullable(),
  password: z.string().min(8).optional(), // If not provided, will generate random
});

// GET /api/admin/users - List all users with filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can manage users
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can access user management" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const role = searchParams.get("role");
    const businessId = searchParams.get("businessId");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build filters
    let whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (businessId) {
      whereClause.businessId = businessId;
    }

    if (isActive !== null) {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get users with related business data
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          business: {
            select: {
              id: true,
              name: true,
              contactPhone: true,
              address: true,
            },
          },
          // logistics regions disabled until schema is fixed
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalUsers: totalCount,
        roleDistribution: await prisma.user.groupBy({
          by: ['role'],
          _count: { role: true },
          where: whereClause,
        }),
        activeUsers: await prisma.user.count({
          where: { ...whereClause, isActive: true },
        }),
      },
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can create users
    if (authResult.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = userCreateSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
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

    // Generate password if not provided
    const bcrypt = require('bcryptjs');
    const password = validatedData.password || Math.random().toString(36).slice(-10) + "Aa1!";
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        role: validatedData.role,
        businessId: validatedData.businessId,
        passwordHash,
        isVerified: false,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            contactPhone: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: newUser.id,
        action: "CREATE",
        details: {
          createdUser: {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role,
            businessId: newUser.businessId,
          },
        },
        changedById: authResult.user.id,
      },
    });

    // TODO: Send welcome email with temporary password
    // For now, return the password in response (should be removed in production)
    const response = {
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        businessId: newUser.businessId,
        createdAt: newUser.createdAt,
      },
      // SECURITY NOTE: In production, password should be sent via secure email
      temporaryPassword: !validatedData.password ? password : undefined,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}