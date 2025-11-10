import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";
import { sendMail } from "@/lib/nodemailer";
import { signJwt } from "@/lib/jose";

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

    const skip = (page - 1) * limit;

    // Get user context including role and merchant access
    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // If not admin, only show their merchants
    if (!isAdmin) {
      if (merchantIds.length === 0) {
        // User has no merchant access
        return NextResponse.json({
          merchants: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }
      where.id = { in: merchantIds };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { businessEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
          subscriptionPlan: {
            select: {
              name: true,
              billingCycle: true,
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              customers: true,
            },
          },
        },
      }),
      prisma.merchant.count({ where }),
    ]);

    return NextResponse.json({
      merchants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get merchants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchants" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can create merchants
  const userContext = await getUserMerchantContext(auth.userId as string);
  if (!userContext.isAdmin) {
    return NextResponse.json({ error: "Only admin users can create merchants" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerPhone,
      businessName,
      businessEmail,
      businessPhone,
      currencyId,
      timezone,
      logoUrl,
      websiteUrl,
      taxId,
      subscriptionPlanId,
      subscriptionPrice,
    } = body;

    console.log('[MERCHANT CREATION] Starting merchant creation process');
    console.log('[MERCHANT CREATION] Owner details:', { ownerFirstName, ownerLastName, ownerEmail });
    console.log('[MERCHANT CREATION] Business details:', { businessName, businessEmail, currencyId });

    // Validate required fields
    if (!ownerFirstName || !ownerLastName || !ownerEmail) {
      return NextResponse.json(
        { error: "Owner first name, last name, and email are required" },
        { status: 400 }
      );
    }

    if (!businessName || !businessEmail || !currencyId) {
      return NextResponse.json(
        { error: "Business name, email, and currency are required" },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (existingUser) {
      console.log('[MERCHANT CREATION] User with email already exists:', ownerEmail);
      return NextResponse.json(
        { error: "A user with this email already exists. Please use a different email address." },
        { status: 409 }
      );
    }

    // Check if currency exists
    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      return NextResponse.json(
        { error: "Currency not found" },
        { status: 404 }
      );
    }

    console.log('[MERCHANT CREATION] Creating new user account for owner...');

    // Create new user account for owner with OTP authentication
    const newOwner = await prisma.user.create({
      data: {
        email: ownerEmail,
        firstName: ownerFirstName,
        lastName: ownerLastName,
        phone: ownerPhone || null,
        role: "MERCHANT",
        preferredAuthMethod: "OTP", // Default to OTP login
        emailVerifiedAt: null, // Not verified yet
      },
    });

    console.log('[MERCHANT CREATION] User created successfully:', newOwner.id);

    const merchantData: any = {
      businessName,
      businessEmail,
      businessPhone,
      ownerUserId: newOwner.id,
      currencyId,
      timezone: timezone || "UTC",
      logoUrl,
      websiteUrl,
      taxId,
      subscriptionPlanId,
      createdBy: auth.userId as string,
      status: "TRIAL", // Default status for new merchants
    };

    // If a subscriptionPrice is provided, persist it into the merchant.settings JSON
    if (subscriptionPrice !== undefined && subscriptionPrice !== null) {
      merchantData.settings = { ...(merchantData.settings || {}), subscriptionPrice };
    }

    console.log('[MERCHANT CREATION] Creating merchant record...');

    const merchant: any = await prisma.merchant.create({
      data: merchantData,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        currency: true,
      },
    });

    console.log('[MERCHANT CREATION] Merchant created successfully:', merchant.id);

    // Send verification email with OTP login instructions
    let emailSent = false;
    let emailError = null;
    
    console.log('[MERCHANT EMAIL] Starting email process for new merchant owner');
    
    try {
      // Generate verification token (7 days expiry)
      console.log('[MERCHANT EMAIL] Generating verification token...');
      const verificationToken = await signJwt(
        { userId: newOwner.id, type: "email_verification" }, 
        "7d"
      );
      
      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? ""}/verify-email?token=${verificationToken}`;
      const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? ""}/login`;
      const subject = `Welcome to Our Platform - Verify Your Email`;

      console.log('[MERCHANT EMAIL] Verification URL:', verificationUrl);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Our Platform!</h1>
          
          <p>Hi ${newOwner.firstName},</p>
          
          <p>Your account has been created as the owner of <strong>${merchant.businessName}</strong>. Welcome aboard!</p>
          
          <h2 style="color: #f08c17; margin-top: 30px;">📧 Step 1: Verify Your Email</h2>
          <p>Please verify your email address to activate your account:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 15px 30px; background-color: #f08c17; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 12px; border-radius: 5px; word-break: break-all; font-size: 13px;">
            ${verificationUrl}
          </p>
          
          <h2 style="color: #f08c17; margin-top: 40px;">🔐 Step 2: Login Using OTP</h2>
          <p>Your account is configured to use <strong>OTP (One-Time Password)</strong> authentication for enhanced security.</p>
          
          <p><strong>How to login:</strong></p>
          <ol style="line-height: 1.8;">
            <li>Visit the <a href="${loginUrl}" style="color: #f08c17;">login page</a></li>
            <li>Enter your email address: <strong>${ownerEmail}</strong></li>
            <li>Click "Send OTP" to receive a one-time password via email</li>
            <li>Enter the OTP code to access your account</li>
          </ol>
          
          <div style="background-color: #e8f4f8; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1976D2;">
              <strong>💡 Tip:</strong> You can later switch to password-based authentication in your account settings if you prefer.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          
          <h3 style="color: #333;">Merchant Account Details</h3>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li>📋 <strong>Business Name:</strong> ${merchant.businessName}</li>
            <li>📧 <strong>Business Email:</strong> ${businessEmail}</li>
            <li>💰 <strong>Currency:</strong> ${currency.code} (${currency.symbol})</li>
            <li>💳 <strong>Subscription Price:</strong> ${currency.symbol}${merchant.settings?.subscriptionPrice ?? "N/A"} ${currency.code}</li>
            <li>⏰ <strong>Timezone:</strong> ${merchant.timezone}</li>
            <li>📊 <strong>Status:</strong> Trial Period</li>
          </ul>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          
          <p style="color: #666; font-size: 13px;">
            This verification link expires in 7 days. If you need assistance, please contact support.
          </p>
          
          <p style="color: #666; font-size: 13px; margin-top: 20px;">
            Best regards,<br>
            The Support Team
          </p>
        </div>
      `;

      console.log('[MERCHANT EMAIL] Attempting to send verification email to:', ownerEmail);
      await sendMail({ to: ownerEmail, subject, html });
      emailSent = true;
      console.log('[MERCHANT EMAIL] Verification email sent successfully!');

      // Log successful email
      await prisma.emailLog.create({
        data: {
          merchantId: merchant.id,
          toEmail: ownerEmail,
          fromEmail: process.env.SMTP_USER || process.env.SMTP_FROM || "",
          subject,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      console.log('[MERCHANT EMAIL] Email log created');
    } catch (err) {
      console.error("[MERCHANT EMAIL] Failed to send verification email:", err);
      console.error("[MERCHANT EMAIL] Error details:", JSON.stringify(err, null, 2));
      emailError = err;
      
      // Log failed email attempt
      try {
        await prisma.emailLog.create({
          data: {
            merchantId: merchant.id,
            toEmail: ownerEmail,
            fromEmail: process.env.SMTP_USER || process.env.SMTP_FROM || "",
            subject: `Failed to send: Welcome email for ${merchant.businessName}`,
            status: "FAILED",
            sentAt: new Date(),
          },
        });
      } catch (e) {
        console.error("[MERCHANT EMAIL] Failed to log failed email attempt:", e);
      }
    }

    let responseMessage = `Merchant "${merchant.businessName}" and owner account created successfully`;
    if (emailSent) {
      responseMessage += ". A verification email with OTP login instructions has been sent to the owner.";
    } else if (emailError) {
      responseMessage += ". However, the verification email could not be sent. Please use the resend verification option.";
    }

    console.log('[MERCHANT CREATION] Process completed successfully');

    return NextResponse.json(
      {
        message: responseMessage,
        merchant,
        owner: {
          id: newOwner.id,
          email: newOwner.email,
          firstName: newOwner.firstName,
          lastName: newOwner.lastName,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MERCHANT CREATION] Create merchant error:", error);
    return NextResponse.json(
      { error: "Failed to create merchant" },
      { status: 500 }
    );
  }
}
