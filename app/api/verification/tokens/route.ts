import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const createTokenSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET", "MFA_SETUP"]),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");
    const includeExpired = searchParams.get("includeExpired") === "true";

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: any = {};

    if (authResult.user.role === "ADMIN") {
      // Admin can see all tokens
      if (userId) where.userId = userId;
      if (type) where.type = type;
    } else {
      // Regular users can only see their own tokens
      where.userId = authResult.user.id;
      if (type) where.type = type;
    }

    // Filter out expired tokens unless specifically requested
    if (!includeExpired) {
      where.expiresAt = {
        gt: new Date(),
      };
    }

    const [tokens, total] = await Promise.all([
      prisma.verificationToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.verificationToken.count({ where }),
    ]);

    // Get summary statistics
    const [typeCounts, expiredCount] = await Promise.all([
      prisma.verificationToken.groupBy({
        by: ['type'],
        where: authResult.user.role === "ADMIN" ? {} : { userId: authResult.user.id },
        _count: true,
      }),
      prisma.verificationToken.count({
        where: {
          ...where,
          expiresAt: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return NextResponse.json({
      tokens: tokens.map(token => ({
        ...token,
        token: `${token.token.substring(0, 8)}...`, // Mask the actual token for security
        isExpired: token.expiresAt < new Date(),
        timeUntilExpiry: token.expiresAt.getTime() - new Date().getTime(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalTokens: total,
        expiredTokens: expiredCount,
        typeBreakdown: Object.fromEntries(typeCounts.map(t => [t.type, t._count])),
      },
    });
  } catch (error) {
    console.error("Error fetching verification tokens:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins or the user themselves can create tokens
    const body = await request.json();
    const validatedData = createTokenSchema.parse(body);

    if (authResult.user.role !== "ADMIN" && validatedData.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate expiration time (default 24 hours for email verification, 1 hour for password reset)
    const defaultExpiryHours = validatedData.type === "PASSWORD_RESET" ? 1 : 24;
    const expiresAt = validatedData.expiresAt 
      ? new Date(validatedData.expiresAt)
      : new Date(Date.now() + defaultExpiryHours * 60 * 60 * 1000);

    // Generate secure random token
    const tokenValue = require('crypto').randomBytes(32).toString('hex');

    // Invalidate any existing tokens of the same type for this user
    await prisma.verificationToken.deleteMany({
      where: {
        userId: validatedData.userId,
        type: validatedData.type,
      },
    });

    const token = await prisma.verificationToken.create({
      data: {
        userId: validatedData.userId,
        token: tokenValue,
        type: validatedData.type,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "VerificationToken",
        entityId: token.id,
        action: "VERIFICATION_TOKEN_CREATED",
        details: {
          tokenType: token.type,
          userId: token.userId,
          userEmail: user.email,
          expiresAt: token.expiresAt,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      token: {
        ...token,
        token: tokenValue, // Return full token only on creation
        isExpired: false,
        timeUntilExpiry: token.expiresAt.getTime() - new Date().getTime(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating verification token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const tokenId = searchParams.get("tokenId");

    if (!userId && !tokenId) {
      return NextResponse.json(
        { error: "Either userId or tokenId is required" },
        { status: 400 }
      );
    }

    // Build where clause for deletion
    let where: any = {};
    
    if (tokenId) {
      where.id = tokenId;
    } else {
      where.userId = userId;
      if (type) where.type = type;
    }

    // Check permissions
    if (authResult.user.role !== "ADMIN") {
      // Non-admin users can only delete their own tokens
      const tokensToDelete = await prisma.verificationToken.findMany({
        where,
        select: { id: true, userId: true, type: true },
      });

      const hasUnauthorizedToken = tokensToDelete.some(token => token.userId !== authResult.user.id);
      if (hasUnauthorizedToken) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const deletedTokens = await prisma.verificationToken.findMany({
      where,
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    const deleteResult = await prisma.verificationToken.deleteMany({ where });

    // Create audit log
    if (deletedTokens.length > 0) {
      await prisma.auditLog.create({
        data: {
          entityType: "VerificationToken",
          entityId: deletedTokens[0].id,
          action: "VERIFICATION_TOKENS_DELETED",
          details: {
            deletedCount: deleteResult.count,
            tokens: deletedTokens.map(t => ({
              id: t.id,
              type: t.type,
              userEmail: t.user.email,
            })),
          },
          changedById: authResult.user.id,
        },
      });
    }

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} verification token(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Error deleting verification tokens:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}