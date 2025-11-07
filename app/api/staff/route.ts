import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching staff` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const merchantId = searchParams.get("merchantId");
    const role = searchParams.get("role");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {};

    // Filter by merchant for non-admin users
    if (merchantId) {
      where.OR = [
        { ownedMerchants: { some: { id: merchantId } } },
        { merchantStaff: { some: { merchantId } } },
      ];
    } else if (!isAdmin) {
      where.OR = [
        { ownedMerchants: { some: { id: { in: merchantIds } } } },
        { merchantStaff: { some: { merchantId: { in: merchantIds } } } },
      ];
    }

    // Filter by role
    if (role && role !== "ALL") {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          ownedMerchants: {
            select: {
              businessName: true,
            },
          },
          merchantStaff: {
            select: {
              merchant: {
                select: {
                  businessName: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      staff: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while creating staff` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      role,
      merchantId,
      password,
    } = body;

    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password if provided
    let hashedPassword;
    if (password) {
      const bcrypt = require("bcryptjs");
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        passwordHash: hashedPassword,
        status: "ACTIVE",
        emailVerifiedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        ownedMerchants: {
          select: {
            businessName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Staff member created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}