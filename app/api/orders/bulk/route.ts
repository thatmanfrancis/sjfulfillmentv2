import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const orderItemSchema = z.object({
  productSku: z.string().min(1),
  quantity: z.number().int().positive(),
});

const bulkOrderSchema = z.object({
  orders: z.array(z.object({
    merchantId: z.string().uuid(),
    externalOrderId: z.string().optional().nullable(),
    customerName: z.string().min(1),
    customerAddress: z.string().min(1),
    customerPhone: z.string(),
    orderDate: z.string().datetime().optional(),
    totalAmount: z.number().positive(),
    items: z.array(orderItemSchema).min(1),
  })).min(1).max(500), // Limit to 500 orders per batch
  options: z.object({
    skipInvalidProducts: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
  }).optional(),
});

const csvSchema = z.object({
  csvData: z.string().min(1),
  merchantId: z.string().uuid(), // Required for CSV uploads
  options: z.object({
    delimiter: z.enum([",", ";", "\t"]).default(","),
    hasHeader: z.boolean().default(true),
    skipInvalidProducts: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
  }).optional(),
});

// Helper function to parse CSV for orders
function parseOrderCSV(csvData: string, delimiter: string = ",", hasHeader: boolean = true) {
  const lines = csvData.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = hasHeader ? lines[0].split(delimiter).map(h => h.trim()) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const orders: any[] = [];
  const orderMap = new Map<string, any>();

  dataLines.forEach((line, index) => {
    const values = line.split(delimiter).map(v => v.trim());
    const lineNumber = index + (hasHeader ? 2 : 1);
    
    let rowData: any = {};
    if (hasHeader) {
      headers.forEach((header, i) => {
        rowData[header] = values[i] || '';
      });
    } else {
      // Assume fixed column order
      rowData = {
        externalOrderId: values[0] || '',
        customerName: values[1] || '',
        customerAddress: values[2] || '',
        customerPhone: values[3] || '',
        orderDate: values[4] || '',
        totalAmount: values[5] || '',
        productSku: values[6] || '',
        quantity: values[7] || '',
      };
    }

    // Group by order (using externalOrderId + customerName as key)
    const orderKey = `${rowData.externalOrderId || 'ORDER'}-${rowData.customerName}-${rowData.customerAddress}`;
    
    if (!orderMap.has(orderKey)) {
      orderMap.set(orderKey, {
        externalOrderId: rowData.externalOrderId || null,
        customerName: rowData.customerName,
        customerAddress: rowData.customerAddress,
        customerPhone: rowData.customerPhone,
        orderDate: rowData.orderDate,
        totalAmount: parseFloat(rowData.totalAmount) || 0,
        items: [],
        lineNumbers: [],
      });
    }

    const order = orderMap.get(orderKey);
    if (rowData.productSku && rowData.quantity) {
      order.items.push({
        productSku: rowData.productSku,
        quantity: parseFloat(rowData.quantity) || 0,
      });
    }
    order.lineNumbers.push(lineNumber);
  });

  return Array.from(orderMap.values());
}

// Helper function to validate order data
function validateOrderData(rawOrder: any, orderIndex: number) {
  const errors: string[] = [];
  
  // Required fields
  if (!rawOrder.customerName || rawOrder.customerName.trim() === '') {
    errors.push(`Customer name is required (order ${orderIndex})`);
  }
  
  if (!rawOrder.customerAddress || rawOrder.customerAddress.trim() === '') {
    errors.push(`Customer address is required (order ${orderIndex})`);
  }

  if (!rawOrder.customerPhone || rawOrder.customerPhone.trim() === '') {
    errors.push(`Customer phone is required (order ${orderIndex})`);
  }

  if (!rawOrder.totalAmount || rawOrder.totalAmount <= 0) {
    errors.push(`Valid total amount is required (order ${orderIndex})`);
  }

  if (!rawOrder.items || !Array.isArray(rawOrder.items) || rawOrder.items.length === 0) {
    errors.push(`At least one item is required (order ${orderIndex})`);
  }

  // Validate items
  if (rawOrder.items && Array.isArray(rawOrder.items)) {
    rawOrder.items.forEach((item: any, itemIndex: number) => {
      if (!item.productSku || item.productSku.trim() === '') {
        errors.push(`Product SKU is required (order ${orderIndex}, item ${itemIndex + 1})`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Valid quantity is required (order ${orderIndex}, item ${itemIndex + 1})`);
      }
    });
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    const isCSV = contentType?.includes("text/csv") || request.headers.get("x-upload-type") === "csv";

    let orders: any[] = [];
    let options: any = {};
    let merchantId: string = "";

    if (isCSV) {
      // Handle CSV upload
      const body = await request.json();
      const csvValidation = csvSchema.parse(body);
      merchantId = csvValidation.merchantId;
      
      const csvOptions = csvValidation.options || { delimiter: ",", hasHeader: true } as const;
      orders = parseOrderCSV(
        csvValidation.csvData, 
        csvOptions.delimiter || ",", 
        csvOptions.hasHeader !== false
      ).map(order => ({ ...order, merchantId })); // Add merchantId to each order
      options = csvOptions;
    } else {
      // Handle JSON bulk upload
      const body = await request.json();
      const validatedData = bulkOrderSchema.parse(body);
      orders = validatedData.orders;
      options = validatedData.options || {};
    }

    // Role-based business logic
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Merchants can only create orders for their own business
      if (isCSV) {
        if (merchantId !== authResult.user.businessId) {
          return NextResponse.json(
            { error: "Can only create orders for your own business" },
            { status: 403 }
          );
        }
      } else {
        // Validate all orders belong to merchant's business
        const hasInvalidMerchant = orders.some(o => o.merchantId !== authResult.user.businessId);
        if (hasInvalidMerchant) {
          return NextResponse.json(
            { error: "Can only create orders for your own business" },
            { status: 403 }
          );
        }
      }
    } else if (authResult.user.role === "ADMIN") {
      // Admin needs to verify all merchants exist
      const merchantIds = [...new Set(orders.map(o => o.merchantId))];
      const existingMerchants = await prisma.business.findMany({
        where: { id: { in: merchantIds } },
        select: { id: true }
      });
      
      const existingMerchantIds = new Set(existingMerchants.map(b => b.id));
      const invalidMerchantIds = merchantIds.filter(id => !existingMerchantIds.has(id));
      
      if (invalidMerchantIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid merchant IDs: ${invalidMerchantIds.join(', ')}` },
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
    const validationErrors: string[] = [];
    const validOrders: any[] = [];
    const productSkus = new Set<string>();

    // Collect all product SKUs for batch validation
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.productSku) {
          productSkus.add(`${order.merchantId}-${item.productSku}`);
        }
      });
    });

    // Get all products for validation
    const merchantProducts = new Map<string, any>();
    const uniqueMerchantIds = [...new Set(orders.map(o => o.merchantId))];
    
    for (const mId of uniqueMerchantIds) {
      const products = await prisma.product.findMany({
        where: { businessId: mId },
        select: { id: true, sku: true, name: true, businessId: true }
      });
      products.forEach(p => {
        merchantProducts.set(`${p.businessId}-${p.sku}`, p);
      });
    }

    // Validate each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderIndex = i + 1;
      
      // Basic order validation
      const orderErrors = validateOrderData(order, orderIndex);
      if (orderErrors.length > 0) {
        validationErrors.push(...orderErrors);
        continue;
      }

      // Product validation
      const validItems: any[] = [];
      let hasInvalidProducts = false;

      for (const item of order.items) {
        const productKey = `${order.merchantId}-${item.productSku}`;
        if (!merchantProducts.has(productKey)) {
          const errorMsg = `Product with SKU "${item.productSku}" not found for this merchant (order ${orderIndex})`;
          if (options.skipInvalidProducts) {
            console.warn(errorMsg);
          } else {
            validationErrors.push(errorMsg);
            hasInvalidProducts = true;
          }
        } else {
          validItems.push({
            ...item,
            product: merchantProducts.get(productKey),
          });
        }
      }

      if (!hasInvalidProducts && validItems.length > 0) {
        validOrders.push({
          ...order,
          items: validItems,
          orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
        });
      }
    }

    if (validationErrors.length > 0 && !options.skipInvalidProducts) {
      return NextResponse.json({
        error: "Validation errors in order data",
        validationErrors,
        totalOrders: orders.length,
        validOrders: validOrders.length,
      }, { status: 400 });
    }

    // If validateOnly mode, return validation results
    if (options.validateOnly) {
      return NextResponse.json({
        message: "Validation completed",
        summary: {
          totalOrders: orders.length,
          validOrders: validOrders.length,
          invalidOrders: orders.length - validOrders.length,
          totalItems: validOrders.reduce((sum, order) => sum + order.items.length, 0),
        },
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      });
    }

    // Processing phase
    const results = {
      created: [] as any[],
      errors: [] as any[],
    };

    // Process in batches to avoid database timeouts
    const batchSize = 25;
    for (let i = 0; i < validOrders.length; i += batchSize) {
      const batch = validOrders.slice(i, i + batchSize);
      
      for (const orderData of batch) {
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
              data: {
                merchantId: authResult.user.businessId!,
                externalOrderId: orderData.externalOrderId,
                customerName: orderData.customerName,
                customerAddress: orderData.customerAddress,
                customerPhone: orderData.customerPhone,
                orderDate: orderData.orderDate,
                status: 'NEW',
                totalAmount: orderData.totalAmount,
              },
            });

            // Create order items
            const orderItems = [];
            for (const item of orderData.items) {
              const orderItem = await tx.orderItem.create({
                data: {
                  orderId: newOrder.id,
                  productId: item.product.id,
                  quantity: item.quantity,
                },
                include: {
                  product: {
                    select: { name: true, sku: true }
                  }
                }
              });
              orderItems.push(orderItem);
            }

            return { ...newOrder, items: orderItems };
          });

          results.created.push(result);
        } catch (error) {
          results.errors.push({
            externalOrderId: orderData.externalOrderId,
            customerName: orderData.customerName,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Create audit log for bulk operation
    await prisma.auditLog.create({
      data: {
        entityType: "Order",
        entityId: "BULK_OPERATION",
        action: "ORDERS_BULK_UPLOAD",
        details: {
          totalProcessed: validOrders.length,
          created: results.created.length,
          errors: results.errors.length,
          uploadType: isCSV ? "CSV" : "JSON",
          options,
          merchantIds: [...new Set(validOrders.map(o => o.merchantId))],
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      message: "Bulk order upload completed",
      summary: {
        totalProcessed: validOrders.length,
        successful: results.created.length,
        errors: results.errors.length,
        totalItems: results.created.reduce((sum: number, order: any) => sum + (order.items?.length || 0), 0),
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
    console.error("Error in bulk order upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}