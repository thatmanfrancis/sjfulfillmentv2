import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isRevoked: z.boolean().optional(),
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

    const apiKey = await prisma.merchantApiKey.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role !== "ADMIN" && apiKey.merchantId !== authResult.user.businessId) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      apiKey: {
        ...apiKey,
        apiKey: `${apiKey.apiKey.substring(0, 12)}...`, // Mask the actual key
      },
    });
  } catch (error) {
    console.error("Error fetching API key:", error);
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
    const validatedData = updateApiKeySchema.parse(body);

    const existingApiKey = await prisma.merchantApiKey.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingApiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role !== "ADMIN" && existingApiKey.merchantId !== authResult.user.businessId) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    const updatedApiKey = await prisma.merchantApiKey.update({
      where: { id },
      data: validatedData,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "MerchantApiKey",
        entityId: updatedApiKey.id,
        action: validatedData.isRevoked === true ? "API_KEY_REVOKED" : "API_KEY_UPDATED",
        details: {
          merchantId: updatedApiKey.merchantId,
          merchantName: existingApiKey.business.name,
          changes: validatedData,
          oldName: existingApiKey.name,
          newName: validatedData.name || existingApiKey.name,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      apiKey: {
        ...updatedApiKey,
        apiKey: `${updatedApiKey.apiKey.substring(0, 12)}...`, // Mask the actual key
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating API key:", error);
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

    const existingApiKey = await prisma.merchantApiKey.findUnique({
      where: { id },
      include: {
        business: {
          select: { name: true },
        },
      },
    });

    if (!existingApiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role !== "ADMIN" && existingApiKey.merchantId !== authResult.user.businessId) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    await prisma.merchantApiKey.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "MerchantApiKey",
        entityId: id,
        action: "API_KEY_DELETED",
        details: {
          merchantId: existingApiKey.merchantId,
          merchantName: existingApiKey.business.name,
          apiKeyName: existingApiKey.name,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}