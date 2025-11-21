import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Update product schema - aligned with actual schema
const updateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  weightKg: z.number().positive("Weight must be positive").optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(), 
    height: z.number().positive().optional()
  }).optional(),
  imageUrl: z.string().optional(),
  stockAllocations: z.array(z.object({
    warehouseId: z.string().min(1, 'Warehouse ID is required'),
    allocatedQuantity: z.number().min(0, 'Allocated quantity must be non-negative'),
    safetyStock: z.number().min(0, 'Safety stock must be non-negative'),
  })).optional(),
});

// GET /api/admin/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET single product:', id);
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            contactPhone: true
          }
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
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate inventory summary
    const totalStock = product.StockAllocation.reduce((sum: number, allocation: any) => sum + allocation.allocatedQuantity, 0);
    const safetyStock = product.StockAllocation.reduce((sum: number, allocation: any) => sum + allocation.safetyStock, 0);

    const formattedProduct = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      weightKg: product.weightKg,
      dimensions: product.dimensions,
      imageUrl: product.imageUrl,
      businessId: product.businessId,
      business: product.Business,
      inventory: {
        totalStock,
        safetyStock,
        warehouses: product.StockAllocation.map(allocation => ({
          warehouseId: allocation.warehouseId,
          warehouseName: allocation.Warehouse.name,
          warehouseCode: allocation.Warehouse.code,
          region: allocation.Warehouse.region,
          allocatedQuantity: allocation.allocatedQuantity,
          safetyStock: allocation.safetyStock
        }))
      }
    };

    return NextResponse.json(formattedProduct);

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('PUT update product:', id);
    
    const body = await request.json();
    console.log('Update data:', body);
    
    // Validate the request body
    const validationResult = updateProductSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Handle stock allocations if provided
    if (body.stockAllocations !== undefined) {
      // Delete existing stock allocations
      await prisma.stockAllocation.deleteMany({
        where: { productId: id }
      });

      // Create new stock allocations if any
      if (body.stockAllocations.length > 0) {
        // Handle default warehouse creation/assignment
        const processedAllocations = [];
        
        for (const allocation of body.stockAllocations) {
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
        const warehouseIds = processedAllocations.map((sa: any) => sa.warehouseId);
        const warehouses = await prisma.warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true }
        });

        if (warehouses.length !== warehouseIds.length) {
          return NextResponse.json(
            { error: "One or more warehouses not found after processing" },
            { status: 400 }
          );
        }

        // Create new stock allocations
        const stockAllocations = processedAllocations.map((sa: any) => ({
          id: `stock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          productId: id,
          warehouseId: sa.warehouseId,
          allocatedQuantity: sa.allocatedQuantity,
          safetyStock: sa.safetyStock,
        }));

        await prisma.stockAllocation.createMany({
          data: stockAllocations
        });
      }
    }

    // Prepare update data, excluding stockAllocations since we handle it separately
    const { stockAllocations, ...productUpdateData } = updateData;

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: productUpdateData,
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            contactPhone: true
          }
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
      }
    });

    // Calculate inventory summary
    const totalStock = updatedProduct.StockAllocation.reduce((sum: number, allocation: any) => sum + allocation.allocatedQuantity, 0);
    const safetyStock = updatedProduct.StockAllocation.reduce((sum: number, allocation: any) => sum + allocation.safetyStock, 0);

    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      sku: updatedProduct.sku,
      weightKg: updatedProduct.weightKg,
      dimensions: updatedProduct.dimensions,
      imageUrl: updatedProduct.imageUrl,
      businessId: updatedProduct.businessId,
      business: updatedProduct.Business,
      inventory: {
        totalStock,
        safetyStock,
        warehouses: updatedProduct.StockAllocation.map(allocation => ({
          warehouseId: allocation.warehouseId,
          warehouseName: allocation.Warehouse.name,
          warehouseCode: allocation.Warehouse.code,
          region: allocation.Warehouse.region,
          allocatedQuantity: allocation.allocatedQuantity,
          safetyStock: allocation.safetyStock
        }))
      }
    };

    console.log('Product updated successfully:', updatedProduct.id);
    return NextResponse.json(formattedProduct);

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('DELETE product:', id);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        StockAllocation: true,
        OrderItem: true
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product has related orders
    if (existingProduct.OrderItem.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing orders. Consider marking it as inactive instead.' },
        { status: 400 }
      );
    }

    // Delete all stock allocations first
    await prisma.stockAllocation.deleteMany({
      where: { productId: id }
    });

    // Delete the product
    await prisma.product.delete({
      where: { id }
    });

    console.log('Product deleted successfully:', id);
    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Handle foreign key constraint errors
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete product due to existing references. Please remove related records first.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}