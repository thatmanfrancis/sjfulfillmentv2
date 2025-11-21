import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { z } from 'zod';



const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1).max(100).optional(), // Make SKU optional for auto-generation
  weightKg: z.number().positive('Weight must be a positive number'),
  businessId: z.string().min(1, 'Business ID is required'), // Remove UUID validation for custom format
  price: z.number().positive('Price must be positive').optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }).optional(),
  stockAllocations: z.array(z.object({
    warehouseId: z.string().min(1, 'Warehouse ID is required'),
    allocatedQuantity: z.number().min(0, 'Allocated quantity must be non-negative'),
    safetyStock: z.number().min(0, 'Safety stock must be non-negative'),
  })).optional(),
});

// Helper function to get or create default warehouse
async function getOrCreateDefaultWarehouse() {
  // First try to find existing default warehouse
  let defaultWarehouse = await prisma.warehouse.findFirst({
    where: {
      name: { equals: 'Default', mode: 'insensitive' },
      status: 'ACTIVE'
    }
  });

  // If no default warehouse exists, create one
  if (!defaultWarehouse) {
    defaultWarehouse = await prisma.warehouse.create({
      data: {
        id: `warehouse_${Date.now()}_default`,
        name: 'Default',
        code: 'DEFAULT',
        region: 'Central',
        address: 'Main Distribution Center',
        city: 'Central City',
        state: 'Default State',
        country: 'Default Country',
        status: 'ACTIVE',
        capacity: 10000,
        currentStock: 0,
        contactEmail: 'warehouse@company.com',
        contactPhone: '+1-000-000-0000',
        manager: 'System Admin',
        type: 'STORAGE',
        description: 'Auto-generated default warehouse for inventory management',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Created default warehouse:', defaultWarehouse.id);
  }

  return defaultWarehouse;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const businessId = searchParams.get('businessId'); // Add businessId filter
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause for filtering
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add businessId filter
    if (businessId && businessId !== '') {
      where.businessId = businessId;
    }

    // Note: Your schema doesn't have a category field, but if you add one later, uncomment this:
    // if (category && category !== '') {
    //   where.category = { equals: category };
    // }

    // Get total count for pagination
    const totalItems = await prisma.product.count({ where });

    // Get paginated products with related data
    const products = await prisma.product.findMany({
      where,
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            address: true,
            city: true,
            state: true,
            country: true,
            contactPhone: true
          }
        },
        ProductImage: {
          where: { isPrimary: true },
          select: {
            imageUrl: true,
            altText: true
          },
          take: 1
        },
        StockAllocation: {
          include: {
            Warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
                region: true
              }
            }
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' }
    });

    // Transform the data to match your frontend expectations
    const transformedProducts = products.map((product: any) => {
      const totalStock = product.StockAllocation?.reduce((sum: number, allocation: any) => sum + allocation.allocatedQuantity, 0) || 0;
      const safetyStock = product.StockAllocation?.reduce((sum: number, allocation: any) => sum + allocation.safetyStock, 0) || 0;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        weightKg: product.weightKg,
        dimensions: product.dimensions,
        imageUrl: product.imageUrl,
        businessId: product.businessId,
        business: {
          id: product.Business?.id,
          name: product.Business?.name,
          address: product.Business?.address,
          city: product.Business?.city,
          state: product.Business?.state,
          country: product.Business?.country,
          phone: product.Business?.contactPhone
        },
        inventory: {
          totalStock,
          safetyStock,
          available: totalStock - safetyStock,
          warehouses: product.StockAllocation?.map((allocation: any) => ({
            warehouseId: allocation.warehouseId,
            warehouseName: allocation.Warehouse?.name,
            warehouseCode: allocation.Warehouse?.code,
            region: allocation.Warehouse?.region,
            quantity: allocation.allocatedQuantity,
            safetyStock: allocation.safetyStock,
            available: allocation.allocatedQuantity - allocation.safetyStock
          }))
        }
      };
    });

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only admins can create products
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('🔍 Product creation request body:', JSON.stringify(body, null, 2));
    
    const validatedData = createProductSchema.parse(body);
    console.log('✅ Validation passed:', JSON.stringify(validatedData, null, 2));

    // Generate SKU if not provided
    let sku = validatedData.sku;
    if (!sku) {
      const productName = validatedData.name.trim();
      const firstLetter = productName.charAt(0).toUpperCase();
      const lastLetter = productName.charAt(productName.length - 1).toUpperCase();
      
      // Find the next available number for this pattern
      let counter = 1;
      let generatedSku: string;
      
      do {
        const paddedCounter = counter.toString().padStart(2, '0');
        generatedSku = `SKU-${firstLetter}${lastLetter}_${paddedCounter}`;
        
        // Check if this SKU exists for any business
        const existingSku = await prisma.product.findFirst({
          where: { sku: generatedSku }
        });
        
        if (!existingSku) {
          sku = generatedSku;
          break;
        }
        
        counter++;
      } while (counter <= 999); // Prevent infinite loop
      
      if (!sku) {
        return NextResponse.json(
          { 
            success: false,
            error: "Could not generate unique SKU",
            message: "Unable to generate a unique SKU. Please provide a custom SKU."
          },
          { status: 400 }
        );
      }
      
      console.log('🏷️ Generated SKU:', sku);
    } else {
      // If SKU is provided, ensure it's uppercase and formatted properly
      sku = sku.trim().toUpperCase();
    }

    // Check if SKU already exists (for any business)
    const existingProduct = await prisma.product.findFirst({
      where: { sku: sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { 
          success: false,
          error: "SKU already exists",
          message: `A product with SKU "${sku}" already exists. Please use a different SKU.`
        },
        { status: 409 }
      );
    }

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      select: { id: true, name: true, isActive: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    if (!business.isActive) {
      return NextResponse.json(
        { error: "Cannot add products to inactive business" },
        { status: 400 }
      );
    }

    // Create the product
    const newProduct = await prisma.product.create({
      data: {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        name: validatedData.name,
        sku: sku, // Use the processed SKU (generated or provided)
        weightKg: validatedData.weightKg,
        businessId: validatedData.businessId,
        dimensions: validatedData.dimensions || {},
        ...(validatedData.price !== undefined ? { price: validatedData.price } : {}),
      },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            country: true,
            contactPhone: true
          }
        }
      }
    });

    // Create stock allocations if provided
    if (validatedData.stockAllocations && validatedData.stockAllocations.length > 0) {
      // Handle default warehouse creation/assignment
      const processedAllocations = [];
      
      for (const allocation of validatedData.stockAllocations) {
        let warehouseId = allocation.warehouseId;
        
        // Check if this is a default warehouse request
        if (warehouseId === 'DEFAULT_WAREHOUSE') {
          // Look for existing default warehouse
          let defaultWarehouse = await prisma.warehouse.findFirst({
            where: { 
              name: 'Default',
              status: 'ACTIVE'
            }
          });
          
          // Create default warehouse if it doesn't exist
          if (!defaultWarehouse) {
            defaultWarehouse = await prisma.warehouse.create({
              data: {
                id: `warehouse_${Date.now()}_default`,
                name: 'Default',
                code: 'DEFAULT',
                region: 'Main',
                status: 'ACTIVE',
                address: 'Auto-generated default warehouse',
                city: 'Default Location',
                state: 'Default State',
                country: 'Default Country',
                updatedAt: new Date()
              }
            });
            console.log('🏭 Created default warehouse:', defaultWarehouse.id);
          }
          
          warehouseId = defaultWarehouse.id;
        }
        
        processedAllocations.push({
          ...allocation,
          warehouseId
        });
      }
      
      // Verify all final warehouses exist
      const warehouseIds = processedAllocations.map(sa => sa.warehouseId);
      const warehouses = await prisma.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, name: true }
      });

      if (warehouses.length !== warehouseIds.length) {
        // Clean up the created product if warehouse validation fails
        await prisma.product.delete({ where: { id: newProduct.id } });
        return NextResponse.json(
          { error: "One or more warehouses not found after processing" },
          { status: 400 }
        );
      }

      // Create stock allocations with processed warehouse IDs
      const stockAllocations = processedAllocations.map(sa => ({
        id: `stock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        productId: newProduct.id,
        warehouseId: sa.warehouseId,
        allocatedQuantity: sa.allocatedQuantity,
        safetyStock: sa.safetyStock,
      }));

      await prisma.stockAllocation.createMany({
        data: stockAllocations
      });
      
      console.log('✅ Created stock allocations:', stockAllocations.length);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        entityType: 'Product',
        entityId: newProduct.id,
        action: 'CREATED',
        details: {
          productName: newProduct.name,
          sku: newProduct.sku,
          businessId: newProduct.businessId,
          businessName: business.name
        },
        changedById: session.userId
      }
    });

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        weightKg: newProduct.weightKg,
        dimensions: newProduct.dimensions,
        businessId: newProduct.businessId,
        business: newProduct.Business,
      },
      message: "Product created successfully"
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('🔥 Validation error:', error.issues);
      return NextResponse.json(
        { 
          success: false,
          error: "Validation error", 
          details: error.issues,
          message: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        },
        { status: 400 }
      );
    }
    console.error("🔥 Error creating product:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}