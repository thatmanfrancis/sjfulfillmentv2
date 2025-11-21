import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getCurrentSession } from '@/lib/session';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

function generateApiKey(): string {
  return `sjf_${randomBytes(32).toString('hex')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with business info
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          role: true,
          businessId: true,
        }
      });
      let business = null;
      if (user?.businessId) {
        business = await prisma.business.findUnique({
          where: { id: user.businessId },
          select: { id: true, name: true }
        });
      }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId");
    const includeRevoked = searchParams.get("includeRevoked") === "true";

    let where: any = {};

    // Role-based filtering
    if (user.role === "ADMIN") {
      if (merchantId) where.merchantId = merchantId;
    } else {
      // Merchant users can only see their own API keys
      if (!user.businessId) {
        return NextResponse.json({ error: 'User not associated with a business' }, { status: 400 });
      }
      where.merchantId = user.businessId;
    }

    // Filter out revoked keys unless explicitly requested
    if (!includeRevoked) {
      where.isRevoked = false;
    }

    const apiKeys = await prisma.merchantApiKey.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Don't return the actual API key in the response for security
    const safeApiKeys = apiKeys.map(key => ({
      ...key,
      apiKey: `${key.apiKey.substring(0, 12)}...`, // Show only first part
    }));

    return NextResponse.json({
      apiKeys: safeApiKeys,
      summary: {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(k => !k.isRevoked).length,
        revokedKeys: apiKeys.filter(k => k.isRevoked).length,
      },
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with business info
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          role: true,
          businessId: true,
        }
      });
      let business = null;
      if (user?.businessId) {
        business = await prisma.business.findUnique({
          where: { id: user.businessId },
          select: { id: true, name: true }
        });
      }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    let merchantId: string;

    if (user.role === "ADMIN") {
      // Admin must specify merchantId
      const { merchantId: reqMerchantId } = body;
      if (!reqMerchantId) {
        return NextResponse.json(
          { error: "merchantId is required for admin users" },
          { status: 400 }
        );
      }
      merchantId = reqMerchantId;
    } else {
      // Merchant users can only create keys for their own business
      if (!user.businessId) {
        return NextResponse.json(
          { error: "User is not associated with a business" },
          { status: 400 }
        );
      }
      merchantId = user.businessId;
    }

    // Verify merchant exists
    const merchant = await prisma.business.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, isActive: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    if (!merchant.isActive) {
      return NextResponse.json(
        { error: "Cannot create API key for inactive merchant" },
        { status: 400 }
      );
    }

    // Check if merchant already has too many active keys (limit to 5)
    const existingKeysCount = await prisma.merchantApiKey.count({
      where: {
        merchantId,
        isRevoked: false,
      },
    });

    if (existingKeysCount >= 5) {
      return NextResponse.json(
        { error: "Maximum number of API keys (5) reached. Please revoke unused keys first." },
        { status: 400 }
      );
    }

    // Generate API key
    const rawApiKey = generateApiKey();
    const hashedApiKey = await hash(rawApiKey, 12);

    const apiKey = await prisma.merchantApiKey.create({
      data: {
        id: crypto.randomUUID(),
        merchantId,
        apiKey: hashedApiKey,
        name: validatedData.name,
      },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "MerchantApiKey",
        entityId: apiKey.id,
        action: "API_KEY_CREATED",
        details: {
          merchantId,
          merchantName: merchant.name,
          apiKeyName: validatedData.name,
          keyPrefix: rawApiKey.substring(0, 12),
        },
        changedById: session.userId,
      },
    });

    return NextResponse.json({
      apiKey: {
        ...apiKey,
        apiKey: rawApiKey, // Return the raw key only once during creation
      },
      warning: "This is the only time the full API key will be displayed. Please store it securely.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}