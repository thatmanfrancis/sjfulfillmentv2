import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { generateRandomPassword } from "@/lib/auth";

const createMerchantSchema = z.object({
  // Business Information
  businessName: z.string().min(1, "Business name is required").max(100),
  businessPhone: z.string().min(10, "Valid phone number is required"),
  businessAddress: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required"),
  }),

  // Primary Contact (Admin User)
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),

  // Business Settings
  currency: z.enum(["USD", "NGN", "CAD", "GBP", "EUR"]).default("USD"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, email: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Debug: Log the incoming request body
    console.log(
      "Merchant creation request body:",
      JSON.stringify(body, null, 2)
    );

    // Validate the request data
    const result = createMerchantSchema.safeParse(body);
    if (!result.success) {
      console.error("=== VALIDATION FAILED ===");
      console.error("Raw body:", JSON.stringify(body, null, 2));
      console.error(
        "Validation errors:",
        JSON.stringify(result.error.issues, null, 2)
      );
      console.error("========================");
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.issues,
          received: body,
        },
        { status: 400 }
      );
    }

    const {
      businessName,
      businessPhone,
      businessAddress,
      firstName,
      lastName,
      email,
      currency,
    } = result.data;

    console.log("Validation successful, extracted data:", {
      businessName,
      businessPhone,
      firstName,
      lastName,
      email,
      currency,
    });

    // Check if email is already in use
    console.log("Checking if email exists...");
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Email already exists:", email);
      return NextResponse.json(
        { error: "Email address is already in use" },
        { status: 400 }
      );
    }

    // Check if business name is already in use
    console.log("Checking if business name exists...");
    const existingBusiness = await prisma.business.findUnique({
      where: { name: businessName },
    });

    if (existingBusiness) {
      console.log("Business name already exists:", businessName);
      return NextResponse.json(
        { error: "Business name is already in use" },
        { status: 400 }
      );
    }

    // Generate temporary password
    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    console.log("Starting database transaction...");

    // Create the merchant account in a transaction
    const result_transaction = await prisma.$transaction(async (prisma) => {
      console.log("Creating business...");
      // Create business
      const business = await prisma.business.create({
        data: {
          id: `bus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: businessName,
          contactPhone: businessPhone,
          address: businessAddress.street,
          city: businessAddress.city,
          state: businessAddress.state,
          country: businessAddress.country,
          baseCurrency: currency,
          onboardingStatus: "PENDING_VERIFICATION", // Admin-created accounts start as pending
          updatedAt: new Date(),
        },
      });

      console.log("Creating user...");
      // Create admin user for the business (auto-verified)
      const user = await prisma.user.create({
        data: {
          id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: "MERCHANT",
          isVerified: true, // Merchants are verified on creation
          businessId: business.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return { business, user };
    });

    console.log("Transaction completed successfully");

    // Send welcome email with credentials using sendEmail
    await sendEmail({
      to: email,
      subject: `Action Required: Your ${businessName} merchant account has been created. You can now log in using the credentials below.`,
      html: `<p>Your ${businessName} merchant account has been created.</p>
        <p><b>Login Credentials:</b><br>
        Email: <b>${email}</b><br>
        Password: <b>${temporaryPassword}</b></p>
        <p>You can log in at <a href='${
          process.env.NEXT_PUBLIC_APP_URL
        }/auth/login'>/auth/login</a>.</p>
        <p>If you have any issues, contact support at <a href='mailto:${
          process.env.SUPPORT_EMAIL || "support@sjfulfillment.com"
        }'>${
        process.env.SUPPORT_EMAIL || "support@sjfulfillment.com"
      }</a>.</p>`,
    });

    console.log("Creating audit log...");
    await createAuditLog(
      session.userId,
      "Business",
      result_transaction.business.id,
      "MERCHANT_CREATED",
      {
        adminEmail: adminUser.email,
        businessName,
        merchantEmail: email,
        currency,
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json(
      {
        message: "Merchant account created successfully",
        merchant: {
          businessId: result_transaction.business.id,
          businessName,
          userId: result_transaction.user.id,
          email,
          temporaryPassword, // Include in response for admin reference
        },
        note: "Welcome email with credentials has been sent to the merchant. They can log in immediately.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("=== MERCHANT CREATION ERROR ===");
    console.error("Error details:", error);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("==============================");
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list merchants (with pagination)
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build where clause for businesses
    const where: any = {
      deletedAt: null, // Exclude soft-deleted merchants
    };
    if (status === "active") {
      // Changed from 'ACTIVE' to 'active' to match frontend
      where.isActive = true;
    } else if (status === "inactive") {
      // Changed from 'INACTIVE' to 'inactive' to match frontend
      where.isActive = false;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          User_User_businessIdToBusiness: {
            some: { email: { contains: search, mode: "insensitive" } },
          },
        },
        {
          User_User_businessIdToBusiness: {
            some: { firstName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          User_User_businessIdToBusiness: {
            some: { lastName: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    // Get merchants with their orders, products, and revenue data
    const [businesses, totalBusinesses] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        include: {
          User_User_businessIdToBusiness: {
            where: { role: "MERCHANT" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isVerified: true,
              mfaEnabled: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          Order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              orderDate: true,
            },
          },
          Product: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.business.count({ where }),
    ]);

    // Calculate stats
    const activeBusinesses = await prisma.business.count({
      where: {
        isActive: true,
        deletedAt: null, // Exclude soft-deleted merchants
      },
    });
    const inactiveBusinesses = totalBusinesses - activeBusinesses;

    // Get total revenue and orders across all businesses
    const allOrders = await prisma.order.findMany({
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const totalRevenue = allOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );
    const totalOrders = allOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Transform businesses data to match frontend expectations
    const transformedMerchants = businesses.map((business: any) => ({
      id: business.id,
      name: business.name,
      email: business.User_User_businessIdToBusiness[0]?.email || "",
      phone: business.contactPhone,
      address: `${business.address || ""}, ${business.city || ""}, ${
        business.state || ""
      }, ${business.country || ""}`
        .replace(/^,\s*|,\s*$/g, "")
        .replace(/,+/g, ","),
      category: "General", // Default category since not in schema
      description: business.description || "",
      isActive: business.isActive,
      baseCurrency: business.baseCurrency || "USD",
      createdAt: business.createdAt.toISOString(),
      _count: {
        users: business.User_User_businessIdToBusiness?.length || 0,
        products: business.Product?.length || 0,
      },
    }));

    return NextResponse.json({
      merchants: transformedMerchants, // Changed from 'businesses' to 'merchants'
      stats: {
        totalMerchants: totalBusinesses, // Changed field names to match frontend
        activeMerchants: activeBusinesses,
        inactiveMerchants: inactiveBusinesses,
        totalRevenue,
        averageOrderValue,
        totalOrders,
      },
      pagination: {
        page,
        limit,
        total: totalBusinesses,
        totalPages: Math.ceil(totalBusinesses / limit), // Changed 'pages' to 'totalPages'
      },
    });
  } catch (error) {
    console.error("Get merchants error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
