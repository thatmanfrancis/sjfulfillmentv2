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
      businessName,
      businessEmail,
      businessPhone,
      ownerUserId,
      currencyId,
      timezone,
      logoUrl,
      websiteUrl,
      taxId,
      subscriptionPlanId,
      subscriptionPrice,
    } = body;

    if (!businessName || !businessEmail || !ownerUserId || !currencyId) {
      return NextResponse.json(
        {
          message:
            `Business name, email, owner user ID, and currency are required ${!businessName ? "businessName " : ""}${!businessEmail ? "businessEmail " : ""}${!ownerUserId ? "ownerUserId " : ""}${!currencyId ? "currencyId " : ""}`.trim(),
        },
        { status: 400 }
      );
    }

    // Check if owner exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerUserId },
    });

    if (!owner) {
      return NextResponse.json(
        { error: "Owner user not found" },
        { status: 404 }
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

    const merchantData: any = {
      businessName,
      businessEmail,
      businessPhone,
      ownerUserId,
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

    // Send welcome email to the owner with verification link if needed
    let emailSent = false;
    let emailError = null;
    
    console.log('[MERCHANT EMAIL] Starting email process for merchant:', merchant.businessName);
    console.log('[MERCHANT EMAIL] Owner email:', merchant?.owner?.email);
    
    try {
      if (merchant?.owner?.email) {
        const ownerEmail = merchant.owner.email;
        
        // Check if owner's email is verified
        const ownerRecord = await prisma.user.findUnique({ 
          where: { id: merchant.owner.id },
          select: { emailVerifiedAt: true }
        });

        console.log('[MERCHANT EMAIL] Owner email verified:', !!ownerRecord?.emailVerifiedAt);

        if (ownerRecord && !ownerRecord.emailVerifiedAt) {
          // Send verification email
          console.log('[MERCHANT EMAIL] Generating verification token...');
          const verificationToken = await signJwt(
            { userId: merchant.owner.id, type: "email_verification" }, 
            "7d" // 7 days for merchant owners
          );
          
          const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? ""}/verify-email?token=${verificationToken}`;
          const subject = `Verify your email - Merchant Account Created`;

          console.log('[MERCHANT EMAIL] Verification URL:', verificationUrl);

          const html = `
            <h1>Welcome to Our Platform!</h1>
            <p>Hi ${merchant.owner.firstName || ""},</p>
            <p>A merchant account <strong>${merchant.businessName}</strong> has been created and associated with your user account.</p>
            <p><strong>Important:</strong> Please verify your email address to access your merchant dashboard.</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f08c17; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
            <p>This link expires in 7 days.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <p><strong>Merchant Details:</strong></p>
            <ul>
              <li>Business Name: ${merchant.businessName}</li>
              <li>Subscription Price: ${merchant.currency?.symbol ?? ""}${merchant.settings?.subscriptionPrice ?? "N/A"} ${merchant.currency?.code ?? ""}</li>
            </ul>
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

          console.log(`[MERCHANT EMAIL] Email log created for: ${ownerEmail}`);
        } else {
          // Owner's email is already verified, send welcome email only
          console.log('[MERCHANT EMAIL] Owner email already verified, sending welcome email...');
          const subject = `Your merchant account "${merchant.businessName}" was created`;
          const html = `
            <h1>New Merchant Account</h1>
            <p>Hi ${merchant.owner.firstName || ""},</p>
            <p>A merchant account <strong>${merchant.businessName}</strong> has been created and associated with your user account.</p>
            <p>You can sign in to manage the merchant here: <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? ""}/dashboard">Open Dashboard</a></p>
            <p><strong>Merchant Details:</strong></p>
            <ul>
              <li>Business Name: ${merchant.businessName}</li>
              <li>Subscription Price: ${merchant.currency?.symbol ?? ""}${merchant.settings?.subscriptionPrice ?? "N/A"} ${merchant.currency?.code ?? ""}</li>
            </ul>
          `;

          console.log('[MERCHANT EMAIL] Attempting to send welcome email to:', ownerEmail);
          await sendMail({ to: ownerEmail, subject, html });
          emailSent = true;
          console.log('[MERCHANT EMAIL] Welcome email sent successfully!');

          // Log email
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

          console.log(`[MERCHANT EMAIL] Email log created for: ${ownerEmail}`);
        }
      } else {
        console.log('[MERCHANT EMAIL] No owner email found, skipping email send');
      }
    } catch (err) {
      console.error("[MERCHANT EMAIL] Failed to send merchant email:", err);
      console.error("[MERCHANT EMAIL] Error details:", JSON.stringify(err, null, 2));
      emailError = err;
      
      // Log failed email attempt
      try {
        if (merchant?.owner?.email) {
          await prisma.emailLog.create({
            data: {
              merchantId: merchant.id,
              toEmail: merchant.owner.email,
              fromEmail: process.env.SMTP_USER || process.env.SMTP_FROM || "",
              subject: `Failed to send: Merchant created: ${merchant.businessName}`,
              status: "FAILED",
              sentAt: new Date(),
            },
          });
        }
      } catch (e) {
        console.error("Failed to log failed email attempt:", e);
      }
    }

    let responseMessage = "Merchant created successfully";
    if (emailSent) {
      responseMessage += ". A verification/welcome email has been sent to the owner.";
    } else if (emailError) {
      responseMessage += ". However, the verification email could not be sent. Please use the resend verification option.";
    }

    return NextResponse.json(
      {
        message: responseMessage,
        merchant,
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create merchant error:", error);
    return NextResponse.json(
      { error: "Failed to create merchant" },
      { status: 500 }
    );
  }
}
