import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching merchant` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    // Check access
    const userRoles = await prisma.role.findMany({
      where: { id: auth.userId as string },
      select: { name: true },
    });

    const isAdmin = userRoles.some((ur) => ur.name === "ADMIN");
    const hasAccessToMerchant = userRoles.some(
      (ur: any) => ur.merchantId === id
    );

    if (!isAdmin && !hasAccessToMerchant) {
      return NextResponse.json(
        { error: "You don't have access to this merchant" },
        { status: 403 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: id },
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
        subscriptionPlan: true,
        businessAddress: true,
        _count: {
          select: {
            orders: true,
            products: true,
            customers: true,
            staff: true,
            warehouses: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error("Get merchant error:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant" },
      { status: 500 }
    );
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while updating merchant` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      businessName,
      businessEmail,
      businessPhone,
      timezone,
      websiteUrl,
      taxId,
    } = body;

    // Check access (Admin or Owner)
    const userRoles = await prisma.role.findMany({
      where: { id: auth.userId as string },
      select: { name: true },
    });

    const isAdmin = userRoles.some((ur: any) => ur.name === "ADMIN");

    const merchant = await prisma.merchant.findUnique({
      where: { id: id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    const isOwner = merchant.ownerUserId === auth.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Only admin or merchant owner can update" },
        { status: 403 }
      );
    }

    const updated = await prisma.merchant.update({
      where: { id: id },
      data: {
        ...(businessName && { businessName }),
        ...(businessEmail && { businessEmail }),
        ...(businessPhone !== undefined && { businessPhone }),
        ...(timezone && { timezone }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(taxId !== undefined && { taxId }),
      },
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

    return NextResponse.json({
      message: "Merchant updated successfully",
      merchant: updated,
    });
  } catch (error) {
    console.error("Update merchant error:", error);
    return NextResponse.json(
      { error: "Failed to update merchant" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while deleting merchant` }, { status: 400 });
  }

  try {
    const { id } = await params;
    // Admin only
    const userRoles = await prisma.role.findMany({
      where: { id: auth.userId as string },
      select: { name: true },
    });

    const isAdmin = userRoles.some((ur) => ur.name === "ADMIN");

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admin can delete merchants" },
        { status: 403 }
      );
    }

    await prisma.merchant.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      message: "Merchant deleted successfully",
    });
  } catch (error) {
    console.error("Delete merchant error:", error);
    return NextResponse.json(
      { error: "Failed to delete merchant" },
      { status: 500 }
    );
  }
}