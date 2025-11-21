import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

interface OrderItem {
  sku: string;
  quantity: number;
}

interface OrderData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  businessName: string;
  items: OrderItem[];
}

interface ValidationResult {
  valid: OrderData[];
  invalid: Array<{ data: OrderData; errors: string[] }>;
  totalItems: number;
  estimatedTotal: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { orders } = await request.json();
    console.log('Received orders for validation:', JSON.stringify(orders, null, 2));

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "No orders provided for validation" }, { status: 400 });
    }

    const validOrders: OrderData[] = [];
    const invalidOrders: Array<{ data: OrderData; errors: string[] }> = [];
    let totalItems = 0;
    let estimatedTotal = 0;

    // Get all businesses and products for validation
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true, isActive: true }
    });

    const products = await prisma.product.findMany({
      select: { 
        id: true, 
        sku: true, 
        name: true,
        businessId: true,
        StockAllocation: {
          select: {
            allocatedQuantity: true,
            warehouseId: true,
            Warehouse: {
              select: {
                name: true,
                region: true
              }
            }
          }
        }
      }
    });

    // Create lookup maps for faster validation
    const businessMap = new Map(businesses.map(b => [b.name.trim().toLowerCase(), b]));
    const productMap = new Map(products.map(p => [p.sku.trim().toLowerCase(), p]));

    for (const order of orders) {
      const errors: string[] = [];

      // Validate customer information
      if (!order.customerName || order.customerName.trim().length < 2) {
        errors.push('Customer name must be at least 2 characters');
      }

      if (!order.customerPhone || !/^[\+]?[0-9\-\(\)\s]{10,}$/.test(order.customerPhone)) {
        errors.push('Valid phone number is required');
      }

      if (!order.customerAddress || order.customerAddress.trim().length < 10) {
        errors.push('Complete delivery address is required (minimum 10 characters)');
      }

      // Validate business
      const business = businessMap.get((order.businessName || '').trim().toLowerCase());
      if (!business) {
        errors.push(`Business "${order.businessName}" not found`);
      } else if (!business.isActive) {
        errors.push(`Business "${order.businessName}" is not active`);
      }

      // Validate items
      if (!Array.isArray(order.items) || order.items.length === 0) {
        errors.push('At least one item is required');
      } else {
        const orderTotal = { amount: 0, items: 0 };
        
        for (const item of order.items) {

          if (!item.sku || !item.quantity || item.quantity < 1) {
            errors.push('Invalid item: SKU and valid quantity required');
            continue;
          }

          const product = productMap.get(item.sku.trim().toLowerCase());
          if (!product) {
            errors.push(`Product with SKU "${item.sku}" not found`);
            continue;
          }

          // Check if product belongs to the business
          if (business && product.businessId !== business.id) {
            errors.push(`Product "${item.sku}" does not belong to business "${order.businessName}"`);
            continue;
          }

          // Check stock availability across all warehouses
          const totalStock = product.StockAllocation.reduce(
            (sum, allocation) => sum + allocation.allocatedQuantity, 0
          );

          if (totalStock < item.quantity) {
            const availableWarehouses = product.StockAllocation
              .filter(allocation => allocation.allocatedQuantity > 0)
              .map(allocation => `${allocation.Warehouse.name} (${allocation.allocatedQuantity} available)`)
              .join(', ');

            if (availableWarehouses) {
              errors.push(
                `Insufficient stock for "${item.sku}". Requested: ${item.quantity}, Available: ${totalStock} in warehouses: ${availableWarehouses}`
              );
            } else {
              errors.push(`Product "${item.sku}" is out of stock in all warehouses`);
            }
          }

          orderTotal.items += item.quantity;
          // Mock price calculation - in real implementation, get actual prices
          orderTotal.amount += item.quantity * 100; // Assuming ₦100 per item for estimation
        }

        totalItems += orderTotal.items;
        estimatedTotal += orderTotal.amount;
      }

      if (errors.length > 0) {
        invalidOrders.push({ data: order, errors });
        console.log('Validation errors for order:', order, errors);
      } else {
        validOrders.push(order);
      }
    }

    const validationResult: ValidationResult = {
      valid: validOrders,
      invalid: invalidOrders,
      totalItems,
      estimatedTotal
    };

    return NextResponse.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error('Error validating bulk orders:', error);
    // If error is a validation error, return details
    if (error instanceof Error && error.message && error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate orders' },
      { status: 500 }
    );
  }
}