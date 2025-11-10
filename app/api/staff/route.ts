import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";
import { sendMail } from "@/lib/nodemailer";
import { signJwt } from "@/lib/jose";

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
        preferredAuthMethod: password ? "PASSWORD" : "OTP",
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

    // Send verification email to the newly created staff member
    try {
      const verificationToken = await signJwt(
        { userId: user.id, type: "email_verification" },
        "7d" // 7 days expiry for staff
      );

      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ""}/verify-email?token=${verificationToken}`;

      await sendMail({
        to: user.email,
        subject: "Verify your email - Staff Account Created",
        html: `
          <h1>Welcome to the Team!</h1>
          <p>Hi ${user.firstName},</p>
          <p>A staff account has been created for you with the role: <strong>${user.role}</strong>.</p>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f08c17; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link expires in 7 days.</p>
          ${password ? `<p><strong>Note:</strong> Your temporary password was provided separately by your administrator. Please change it after your first login.</p>` : `<p>You will receive a one-time password (OTP) via email when you log in.</p>`}
        `,
      });

      console.log(`Verification email sent to staff member: ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send verification email to staff member:", emailError);
      // Don't fail the request, but log the error
      // The admin can resend verification email later if needed
    }

    return NextResponse.json(
      {
        message: "Staff member created successfully. A verification email has been sent.",
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