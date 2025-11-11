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
    
    // Check if user is admin or has access to this merchant
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        id: true,
        role: true,
        merchantStaff: {
          select: {
            merchantId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";
    const hasAccessToMerchant = user.merchantStaff?.some(
      (staff) => staff.merchantId === id
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
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";

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
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admin can delete merchants" },
        { status: 403 }
      );
    }

    console.log(`[MERCHANT DELETE] Starting deletion process for merchant: ${id}`);

    // Get count of products before archiving
    const productCount = await prisma.product.count({
      where: {
        merchantId: id,
        deletedAt: null,
      },
    });

    console.log(`[MERCHANT DELETE] Found ${productCount} active products to archive`);

    // Use a transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Archive all products owned by this merchant
      const archivedProducts = await tx.product.updateMany({
        where: {
          merchantId: id,
          deletedAt: null, // Only archive products that haven't been deleted
        },
        data: {
          status: "ARCHIVED",
          deletedAt: new Date(), // Soft delete the products as well
        },
      });

      console.log(`[MERCHANT DELETE] Archived ${archivedProducts.count} products`);

      // Soft delete the merchant
      const deletedMerchant = await tx.merchant.update({
        where: { id: id },
        data: {
          deletedAt: new Date(),
          status: "CANCELLED",
        },
        include: {
          owner: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { merchant: deletedMerchant, productsArchived: archivedProducts.count };
    });

    console.log(`[MERCHANT DELETE] Successfully deleted merchant and archived ${result.productsArchived} products`);

    return NextResponse.json({
      message: `Merchant deleted successfully. ${result.productsArchived} product(s) have been archived for data retention.`,
      productsArchived: result.productsArchived,
    });
  } catch (error) {
    console.error("[MERCHANT DELETE] Delete merchant error:", error);
    return NextResponse.json(
      { error: "Failed to delete merchant" },
      { status: 500 }
    );
  }
}