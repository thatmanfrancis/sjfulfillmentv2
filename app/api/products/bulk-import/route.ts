import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while importing products` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { merchantId, products } = body;

    if (!merchantId || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Merchant ID and products array are required" },
        { status: 400 }
      );
    }

    // Validate and create products
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const productData of products) {
      try {
        // Check for duplicate SKU
        const existing = await prisma.product.findUnique({
          where: {
            merchantId_sku: {
              merchantId,
              sku: productData.sku,
            },
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            sku: productData.sku,
            error: "SKU already exists",
          });
          continue;
        }

        await prisma.product.create({
          data: {
            ...productData,
            merchantId,
            status: "ACTIVE",
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          sku: productData.sku,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Bulk import completed. ${results.success} succeeded, ${results.failed} failed.`,
      results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Failed to import products" },
      { status: 500 }
    );
  }
}
