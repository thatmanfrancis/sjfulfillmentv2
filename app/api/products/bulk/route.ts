import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import prisma from "@/lib/prisma";

async function generateUniqueSku(merchantId: string, baseName = 'PROD') {
  const sanitize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'PROD';
  const prefix = sanitize(merchantId || 'MRC');
  const base = sanitize(baseName);

  for (let i = 0; i < 6; i++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `${prefix}-${base}-${suffix}`.slice(0, 64);
    const existing = await prisma.product.findUnique({
      where: { merchantId_sku: { merchantId, sku: candidate } }
    }).catch(() => null);
    if (!existing) return candidate;
  }
  return `${prefix}-${base}-${Date.now()}`;
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
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can bulk upload products" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const merchantId = formData.get("merchantId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant ID is required" },
        { status: 400 }
      );
    }

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Parse CSV
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      products: [] as any[],
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1;
      try {
        const values = lines[i].split(",").map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate required fields
        const name = row.name || row.productname || "";
        if (!name) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "Product name is required",
          });
          continue;
        }

        // Generate SKU if not provided
        const sku = row.sku?.trim() || await generateUniqueSku(merchantId, name);

        // Check for duplicate SKU
        const existingProduct = await prisma.product.findUnique({
          where: {
            merchantId_sku: {
              merchantId,
              sku,
            },
          },
        });

        if (existingProduct) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: `Product with SKU "${sku}" already exists`,
          });
          continue;
        }

        // Parse numeric values
        const costPrice = parseFloat(row.costprice || row.cost_price || "0") || undefined;
        const sellingPrice = parseFloat(row.sellingprice || row.selling_price || "0") || undefined;
        const weight = parseFloat(row.weight || "0") || undefined;
        const quantity = parseInt(row.quantity || "0") || 0;

        // Create product
        const product = await prisma.product.create({
          data: {
            merchantId,
            sku,
            name,
            description: row.description || null,
            categoryId: row.categoryid || row.category_id || null,
            costPrice,
            sellingPrice,
            weight,
            weightUnit: row.weightunit || row.weight_unit || null,
            status: (row.status?.toUpperCase() || "ACTIVE") as any,
          },
        });

        // Create inventory if warehouse and quantity provided
        const warehouseId = row.warehouseid || row.warehouse_id;
        if (warehouseId && quantity > 0) {
          try {
            await prisma.inventory.create({
              data: {
                productId: product.id,
                warehouseId,
                quantityAvailable: quantity,
                quantityReserved: 0,
                quantityIncoming: 0,
                reorderPoint: 10,
                reorderQuantity: Math.ceil(quantity / 2),
              },
            });
          } catch (invError) {
            console.error(`Failed to create inventory for row ${rowNumber}:`, invError);
            // Continue without inventory - product is still created
          }
        }

        results.success++;
        results.products.push(product);
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message || "Failed to create product",
        });
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload products" },
      { status: 500 }
    );
  }
}
