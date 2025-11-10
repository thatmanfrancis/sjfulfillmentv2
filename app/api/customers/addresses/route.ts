import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // Verify customer access
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && !merchantIds.includes(customer.merchantId)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Get addresses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      customerId,
      merchantId,
      type,
      firstName,
      lastName,
      company,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      countryCode,
      phone,
      isDefault,
    } = body;

    if (!customerId && !merchantId) {
      return NextResponse.json(
        { error: "Either customerId or merchantId is required" },
        { status: 400 }
      );
    }

    if (!type || !addressLine1 || !city || !state || !postalCode || !countryCode) {
      return NextResponse.json(
        { error: "Address type and all address fields are required" },
        { status: 400 }
      );
    }

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    // If customerId provided, verify customer access
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      if (!isAdmin && !merchantIds.includes(customer.merchantId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      // If this is set as default, unset other defaults for this customer
      if (isDefault) {
        await prisma.address.updateMany({
          where: {
            customerId,
            type,
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    // If merchantId provided, verify merchant access
    if (merchantId && !isAdmin && !merchantIds.includes(merchantId)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const address = await prisma.address.create({
      data: {
        customerId,
        merchantId,
        type,
        firstName,
        lastName,
        company,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        countryCode,
        phone,
        isDefault: isDefault ?? false,
        validated: false,
      },
    });

    return NextResponse.json(
      {
        message: "Address created successfully",
        address,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create address error:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
