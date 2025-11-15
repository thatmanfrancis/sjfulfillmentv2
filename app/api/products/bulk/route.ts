import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const bulkProductSchema = z.object({
  products: z.array(z.object({
    businessId: z.string().uuid(),
    sku: z.string().min(1),
    name: z.string().min(1),
    weightKg: z.number().positive(),
    dimensions: z.record(z.string(), z.number()).optional(), // JSON object like { "length": 1, "width": 2, "height": 3 }
    // Additional optional fields for bulk import
    category: z.string().optional(),
    description: z.string().optional(),
    unitCost: z.number().positive().optional(),
    sellingPrice: z.number().positive().optional(),
    barcode: z.string().optional(),
    hsCode: z.string().optional(),
  })).min(1).max(1000), // Limit to 1000 products per batch
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false), // Dry run mode
  }).optional(),
});

const csvSchema = z.object({
  csvData: z.string().min(1),
  businessId: z.string().uuid(), // Required for CSV uploads
  options: z.object({
    delimiter: z.enum([",", ";", "\t"]).default(","),
    hasHeader: z.boolean().default(true),
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
  }).optional(),
});

// Helper function to parse CSV
function parseCSV(csvData: string, delimiter: string = ",", hasHeader: boolean = true) {
  const lines = csvData.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = hasHeader ? lines[0].split(delimiter).map(h => h.trim()) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const values = line.split(delimiter).map(v => v.trim());
    if (hasHeader) {
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return { data: row, lineNumber: index + 2 }; // +2 because we account for header and 0-based index
    } else {
      return { data: values, lineNumber: index + 1 };
    }
  });
}

// Helper function to validate and transform product data
function validateProductData(rawProduct: any, businessId: string, lineNumber?: number) {
  const errors: string[] = [];
  
  // Required fields
  if (!rawProduct.name || rawProduct.name.trim() === '') {
    errors.push(`Name is required${lineNumber ? ` (line ${lineNumber})` : ''}`);
  }
  
  if (!rawProduct.sku || rawProduct.sku.trim() === '') {
    errors.push(`SKU is required${lineNumber ? ` (line ${lineNumber})` : ''}`);
  }

  if (!rawProduct.weightKg || isNaN(parseFloat(rawProduct.weightKg)) || parseFloat(rawProduct.weightKg) <= 0) {
    errors.push(`Valid weight in kg is required${lineNumber ? ` (line ${lineNumber})` : ''}`);
  }

  // Transform product data
  const product: any = {
    businessId,
    name: rawProduct.name?.trim(),
    sku: rawProduct.sku?.trim(),
    weightKg: parseFloat(rawProduct.weightKg),
  };

  // Handle dimensions JSON
  if (rawProduct.dimensions) {
    try {
      if (typeof rawProduct.dimensions === 'string') {
        product.dimensions = JSON.parse(rawProduct.dimensions);
      } else if (typeof rawProduct.dimensions === 'object') {
        product.dimensions = rawProduct.dimensions;
      }
      
      // Validate dimensions object
      if (typeof product.dimensions !== 'object' || 
          !product.dimensions.length || 
          !product.dimensions.width || 
          !product.dimensions.height) {
        errors.push(`Dimensions must include length, width, and height${lineNumber ? ` (line ${lineNumber})` : ''}`);
      }
    } catch (e) {
      errors.push(`Invalid dimensions JSON format${lineNumber ? ` (line ${lineNumber})` : ''}`);
    }
  } else {
    // Set default dimensions if not provided
    product.dimensions = { length: 0.1, width: 0.1, height: 0.1 };
  }

  // Handle optional fields
  if (rawProduct.category) {
    product.category = rawProduct.category.trim();
  }

  if (rawProduct.description) {
    product.description = rawProduct.description.trim();
  }

  if (rawProduct.unitCost) {
    const unitCost = parseFloat(rawProduct.unitCost);
    if (!isNaN(unitCost) && unitCost > 0) {
      product.unitCost = unitCost;
    }
  }

  if (rawProduct.sellingPrice) {
    const sellingPrice = parseFloat(rawProduct.sellingPrice);
    if (!isNaN(sellingPrice) && sellingPrice > 0) {
      product.sellingPrice = sellingPrice;
    }
  }

  if (rawProduct.barcode) {
    product.barcode = rawProduct.barcode.trim();
  }

  if (rawProduct.hsCode) {
    product.hsCode = rawProduct.hsCode.trim();
  }

  return { product, errors };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    const isCSV = contentType?.includes("text/csv") || request.headers.get("x-upload-type") === "csv";

    let validatedData: any;
    let products: any[] = [];
    let options: any = {};
    let businessId: string | undefined;

    if (isCSV) {
      // Handle CSV upload
      const body = await request.json();
      const csvValidation = csvSchema.parse(body);
      businessId = csvValidation.businessId;
      
      const csvOptions = csvValidation.options || { delimiter: ",", hasHeader: true } as const;
      const parsedCSV = parseCSV(
        csvValidation.csvData, 
        csvOptions.delimiter || ",", 
        csvOptions.hasHeader !== false
      );

      // Transform CSV data to product objects
      const validationErrors: string[] = [];
      products = [];

      for (const row of parsedCSV) {
        const { product, errors } = validateProductData(row.data, businessId, row.lineNumber);
        if (errors.length > 0) {
          validationErrors.push(...errors);
        } else {
          products.push(product);
        }
      }

      if (validationErrors.length > 0) {
        return NextResponse.json({
          error: "Validation errors in CSV data",
          validationErrors,
          totalRows: parsedCSV.length,
          validRows: products.length,
        }, { status: 400 });
      }

      options = csvOptions;
    } else {
      // Handle JSON bulk upload
      const body = await request.json();
      validatedData = bulkProductSchema.parse(body);
      products = validatedData.products;
      options = validatedData.options || {};
    }

    // Role-based business logic
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only upload products for their own business
      if (isCSV && businessId) {
        if (businessId !== authResult.user.businessId) {
          return NextResponse.json(
            { error: "Can only upload products for your own business" },
            { status: 403 }
          );
        }
      } else {
        // Validate all products belong to merchant's business
        const hasInvalidBusiness = products.some(p => p.businessId !== authResult.user.businessId);
        if (hasInvalidBusiness) {
          return NextResponse.json(
            { error: "Can only upload products for your own business" },
            { status: 403 }
          );
        }
      }
    } else if (authResult.user.role === "ADMIN") {
      // Admin needs to verify all businesses exist
      const businessIds = [...new Set(products.map(p => p.businessId))];
      const existingBusinesses = await prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true }
      });
      
      const existingBusinessIds = new Set(existingBusinesses.map(b => b.id));
      const invalidBusinessIds = businessIds.filter(id => !existingBusinessIds.has(id));
      
      if (invalidBusinessIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid business IDs: ${invalidBusinessIds.join(', ')}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Validation phase
    const skuMap = new Map<string, number>(); // Track duplicate SKUs in current batch
    const validationErrors: string[] = [];
    const validProducts: any[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productIndex = i + 1;
      const skuKey = `${product.businessId}-${product.sku}`;

      // Check for duplicate SKUs in current batch
      if (skuMap.has(skuKey)) {
        validationErrors.push(`Duplicate SKU "${product.sku}" for business in batch (items ${skuMap.get(skuKey)} and ${productIndex})`);
        continue;
      }
      skuMap.set(skuKey, productIndex);

      // Check if SKU already exists in database for this business
      const existingProduct = await prisma.product.findFirst({
        where: {
          sku: product.sku,
          businessId: product.businessId,
        }
      });

      if (existingProduct) {
        if (!options.skipDuplicates && !options.updateExisting) {
          validationErrors.push(`Product with SKU "${product.sku}" already exists for this business (item ${productIndex})`);
          continue;
        }
        
        if (options.updateExisting) {
          validProducts.push({ ...product, existingId: existingProduct.id, isUpdate: true });
        }
        // If skipDuplicates is true, we just skip this product silently
      } else {
        validProducts.push({ ...product, isUpdate: false });
      }
    }

    if (validationErrors.length > 0 && !options.skipDuplicates) {
      return NextResponse.json({
        error: "Validation errors in product data",
        validationErrors,
        totalProducts: products.length,
        validProducts: validProducts.length,
      }, { status: 400 });
    }

    // If validateOnly mode, return validation results
    if (options.validateOnly) {
      return NextResponse.json({
        message: "Validation completed",
        summary: {
          totalProducts: products.length,
          validProducts: validProducts.length,
          duplicatesSkipped: products.length - validProducts.length,
          toCreate: validProducts.filter(p => !p.isUpdate).length,
          toUpdate: validProducts.filter(p => p.isUpdate).length,
        },
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      });
    }

    // Processing phase
    const results = {
      created: [] as any[],
      updated: [] as any[],
      errors: [] as any[],
    };

    // Process in batches to avoid database timeouts
    const batchSize = 50;
    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);
      
      for (const productData of batch) {
        try {
          const { existingId, isUpdate, ...cleanProductData } = productData;
          
          if (isUpdate && existingId) {
            // Update existing product
            const updatedProduct = await prisma.product.update({
              where: { id: existingId },
              data: cleanProductData,
            });
            results.updated.push(updatedProduct);
          } else {
            // Create new product
            const newProduct = await prisma.product.create({
              data: cleanProductData,
            });
            results.created.push(newProduct);
          }
        } catch (error) {
          results.errors.push({
            sku: productData.sku,
            businessId: productData.businessId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Create audit log for bulk operation
    await prisma.auditLog.create({
      data: {
        entityType: "Product",
        entityId: "BULK_OPERATION",
        action: "PRODUCTS_BULK_UPLOAD",
        details: {
          totalProcessed: validProducts.length,
          created: results.created.length,
          updated: results.updated.length,
          errors: results.errors.length,
          uploadType: isCSV ? "CSV" : "JSON",
          options,
          businessIds: [...new Set(validProducts.map(p => p.businessId))],
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      message: "Bulk product upload completed",
      summary: {
        totalProcessed: validProducts.length,
        successful: results.created.length + results.updated.length,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length,
      },
      results,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error in bulk product upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}