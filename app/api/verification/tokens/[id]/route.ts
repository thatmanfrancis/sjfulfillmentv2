import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateTokenSchema = z.object({
  type: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET", "MFA_SETUP"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

const verifyTokenSchema = z.object({
  token: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const token = await prisma.verificationToken.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Verification token not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (authResult.user.role !== "ADMIN" && token.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const isExpired = token.expiresAt < new Date();
    const timeUntilExpiry = token.expiresAt.getTime() - new Date().getTime();

    return NextResponse.json({
      token: {
        ...token,
        token: `${token.token.substring(0, 8)}...`, // Mask the actual token for security
        isExpired,
        timeUntilExpiry,
        canBeUsed: !isExpired,
      },
    });
  } catch (error) {
    console.error("Error fetching verification token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTokenSchema.parse(body);

    const existingToken = await prisma.verificationToken.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!existingToken) {
      return NextResponse.json(
        { error: "Verification token not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (authResult.user.role !== "ADMIN" && existingToken.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    
    if (validatedData.type) {
      updateData.type = validatedData.type;
    }
    
    if (validatedData.expiresAt) {
      updateData.expiresAt = new Date(validatedData.expiresAt);
    }

    const updatedToken = await prisma.verificationToken.update({
      where: { id },
      data: updateData,
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
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "VerificationToken",
        entityId: id,
        action: "VERIFICATION_TOKEN_UPDATED",
        details: {
          changes: validatedData,
          previousValues: {
            type: existingToken.type,
            expiresAt: existingToken.expiresAt,
          },
          userEmail: existingToken.user.email,
        },
        changedById: authResult.user.id,
      },
    });

    const isExpired = updatedToken.expiresAt < new Date();
    const timeUntilExpiry = updatedToken.expiresAt.getTime() - new Date().getTime();

    return NextResponse.json({
      token: {
        ...updatedToken,
        token: `${updatedToken.token.substring(0, 8)}...`, // Mask the actual token
        isExpired,
        timeUntilExpiry,
        canBeUsed: !isExpired,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating verification token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const token = await prisma.verificationToken.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Verification token not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (authResult.user.role !== "ADMIN" && token.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.verificationToken.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "VerificationToken",
        entityId: id,
        action: "VERIFICATION_TOKEN_DELETED",
        details: {
          tokenType: token.type,
          userEmail: token.user.email,
          wasExpired: token.expiresAt < new Date(),
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      message: "Verification token deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting verification token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { token: providedToken } = verifyTokenSchema.parse(body);

    // Find token by ID and verify it matches the provided token value
    const storedToken = await prisma.verificationToken.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
            role: true,
          },
        },
      },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: "Verification token not found" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Verify token value matches
    if (storedToken.token !== providedToken) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Handle different token types
    let updateResult = null;
    let actionDetails: any = {};

    switch (storedToken.type) {
      case "EMAIL_VERIFICATION":
        if (storedToken.user.isVerified) {
          return NextResponse.json(
            { error: "Email is already verified" },
            { status: 400 }
          );
        }

        updateResult = await prisma.user.update({
          where: { id: storedToken.userId },
          data: { 
            isVerified: true,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isVerified: true,
          },
        });

        actionDetails = {
          action: "EMAIL_VERIFIED",
          userEmail: storedToken.user.email,
          verifiedAt: new Date(),
        };
        break;

      case "PASSWORD_RESET":
        // For password reset, we just verify the token is valid
        // The actual password change should happen in a separate endpoint
        actionDetails = {
          action: "PASSWORD_RESET_TOKEN_VERIFIED",
          userEmail: storedToken.user.email,
          verifiedAt: new Date(),
        };
        break;

      case "MFA_SETUP":
        actionDetails = {
          action: "MFA_SETUP_TOKEN_VERIFIED",
          userEmail: storedToken.user.email,
          verifiedAt: new Date(),
        };
        break;

      default:
        return NextResponse.json(
          { error: "Unknown token type" },
          { status: 400 }
        );
    }

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "VerificationToken",
        entityId: id,
        action: "VERIFICATION_TOKEN_USED",
        details: {
          tokenType: storedToken.type,
          userEmail: storedToken.user.email,
          ...actionDetails,
        },
        changedById: storedToken.userId, // User verified their own token
      },
    });

    return NextResponse.json({
      message: "Verification token successfully verified",
      tokenType: storedToken.type,
      user: updateResult || {
        id: storedToken.user.id,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        email: storedToken.user.email,
      },
      action: actionDetails.action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error verifying token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}