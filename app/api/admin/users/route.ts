import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/role";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["ADMIN"]);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          avatarUrl: true,
          ownedMerchants: {
            select: {
              id: true,
              businessName: true,
            },
            take: 1,
          },
          merchantStaff: {
            select: {
              merchant: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format users data to include merchant info
    const formattedUsers = users.map(user => ({
      ...user,
      lastLogin: user.lastLoginAt,
      merchant: user.ownedMerchants[0] || user.merchantStaff[0]?.merchant || null,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      totalCount: total,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
