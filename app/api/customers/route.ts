import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const merchantId = searchParams.get("merchantId");

    const skip = (page - 1) * limit;

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      deletedAt: null,
    };

    // Filter by merchant
    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
            },
          },
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      merchantId,
      email,
      firstName,
      lastName,
      phone,
      customerNotes,
      tags,
      customFields,
    } = body;

    if (!merchantId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Merchant ID, email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Check if customer already exists for this merchant
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        merchantId_email: {
          merchantId,
          email,
        },
      },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer with this email already exists for this merchant" },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        merchantId,
        email,
        firstName,
        lastName,
        phone,
        customerNotes,
        tags,
        customFields,
        status: "ACTIVE",
        createdBy: auth.userId as string,
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Customer created successfully",
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}