import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// Validation schemas
// Removed unused userUpdateSchema

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
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can manage users
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
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
    const whereClause: any = {};

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
          Business_User_businessIdToBusiness: {
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
        verifiedUsers: await prisma.user.count({
          where: { ...whereClause, isVerified: true },
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
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can create users
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
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
    const password = validatedData.password || Math.random().toString(36).slice(-10) + "Aa1!";
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user (auto-verified)
    const newUser = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        role: validatedData.role,
        businessId: validatedData.businessId || null,
        passwordHash,
        isVerified: true,
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        updatedAt: new Date()
      },
      include: {
        Business_User_businessIdToBusiness: {
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
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        entityType: 'User',
        entityId: newUser.id,
        action: 'CREATED',
        details: {
          createdUser: {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role,
            businessId: newUser.businessId
          }
        },
        changedById: session.userId
      }
    });


    // Send welcome email with credentials
    try {
      const { createNotification } = await import('@/lib/notifications');
      await createNotification(
        newUser.id,
        `Your account has been created. You can now log in using the credentials below.`,
        null,
        'MERCHANT_WELCOME',
        {
          firstName: newUser.firstName,
          email: newUser.email,
          password,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@sjfulfillment.com'
        }
      );
      console.log('Welcome email sent to user:', newUser.email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Return user info only (no password in response)
    return NextResponse.json({
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        businessId: newUser.businessId,
        createdAt: newUser.createdAt,
      }
    }, { status: 201 });

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

// PATCH /api/admin/users - Handle user actions (verify, activate, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can perform user actions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can perform user actions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "User ID and action are required" },
        { status: 400 }
      );
    }

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

    // Prevent admin from acting on themselves for destructive actions
    if (userId === session.userId && ['deactivate', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: "Cannot perform this action on your own account" },
        { status: 400 }
      );
    }

    let updatedUser;
    let auditAction;
    let auditDetails: any = {};

    switch (action) {
      case 'verify':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isVerified: true },
        });
        auditAction = 'VERIFY';
        auditDetails = { verifiedUser: { id: userId, email: existingUser.email } };
        break;

      case 'unverify':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isVerified: false },
        });
        auditAction = 'UNVERIFY';
        auditDetails = { unverifiedUser: { id: userId, email: existingUser.email } };
        break;

      case 'resetPassword':
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { passwordHash },
        });
        auditAction = 'RESET_PASSWORD';
        auditDetails = { resetPasswordFor: { id: userId, email: existingUser.email } };
        
        // TODO: Send email with temporary password
        console.log(`Temporary password for ${existingUser.email}: ${tempPassword}`);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        entityType: 'User',
        entityId: userId,
        action: auditAction,
        details: auditDetails,
        changedById: session.userId
      }
    });

    // Remove sensitive data

    // Remove sensitive fields from user object
    const userObj = updatedUser || existingUser;
    const { passwordHash, ...safeUser } = userObj;

    return NextResponse.json({ 
      success: true, 
      user: safeUser,
      message: `User ${action} completed successfully`
    });

  } catch (error) {
    console.error(`Error performing user action:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}