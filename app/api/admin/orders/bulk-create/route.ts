import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { generateUniqueTrackingNumber } from '@/lib/tracking';

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

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "No orders provided" }, { status: 400 });
    }

    const createdOrders: any[] = [];
    const failedOrders = [];

    // Get businesses and products for lookup
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });

    const products = await prisma.product.findMany({
      select: { 
        id: true, 
        sku: true, 
        businessId: true,
        StockAllocation: {
          select: {
            id: true,
            allocatedQuantity: true,
            warehouseId: true
          }
        }
      }
    });

    const businessMap = new Map(businesses.map(b => [b.name.toLowerCase(), b]));
    const productMap = new Map(products.map(p => [p.sku.toLowerCase(), p]));

    // Process each order in a transaction
    for (const orderData of orders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Find business
          const business = businessMap.get(orderData.businessName.toLowerCase());
          if (!business) {
            throw new Error(`Business "${orderData.businessName}" not found`);
          }

          // Calculate total amount and validate stock
          let totalAmount = 0;
          const itemsToCreate = [];
          const stockUpdates: any[] = [];
          let fulfillmentWarehouseId = null;


          // Aggregate items by SKU (case-insensitive)
          const aggregatedItemsMap = new Map();
          for (const item of orderData.items) {
            const sku = item.sku.toLowerCase();
            if (aggregatedItemsMap.has(sku)) {
              aggregatedItemsMap.get(sku).quantity += item.quantity;
            } else {
              aggregatedItemsMap.set(sku, { ...item, sku, quantity: item.quantity });
            }
          }

          for (const aggItem of Array.from(aggregatedItemsMap.values())) {
            const product = productMap.get(aggItem.sku);
            if (!product) {
              throw new Error(`Product with SKU "${aggItem.sku}" not found`);
            }

            // Find warehouses with available stock
            const availableAllocations = product.StockAllocation
              .filter(allocation => allocation.allocatedQuantity >= aggItem.quantity)
              .sort((a, b) => b.allocatedQuantity - a.allocatedQuantity);

            if (availableAllocations.length === 0) {
              throw new Error(`Insufficient stock for product "${aggItem.sku}"`);
            }

            // Use the warehouse with the most stock
            const allocation = availableAllocations[0];

            itemsToCreate.push({
              productId: product.id,
              quantity: aggItem.quantity
            });

            // Plan stock reduction
            stockUpdates.push({
              allocationId: allocation.id,
              newQuantity: allocation.allocatedQuantity - aggItem.quantity
            });

            // Set fulfillment warehouse (use first item's warehouse for simplicity)
            if (!fulfillmentWarehouseId) {
              fulfillmentWarehouseId = allocation.warehouseId;
            }

            // Mock price calculation - in real implementation, get actual product prices
            totalAmount += aggItem.quantity * 100; // Assuming ₦100 per item
          }

          // Generate unique tracking number
          const trackingNumber = await generateUniqueTrackingNumber();

          // Create the order
          // Generate a unique 6-character alphanumeric order ID
          function generateOrderId(): string {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return (result && result.length === 6) ? result : 'AAAAAA';
          }

          // Generate a unique 6-character alphanumeric order ID
          let newOrderId: string = 'AAAAAA';
          while (true) {
            const candidate = generateOrderId();
            if (typeof candidate !== 'string' || !candidate) continue;
            const exists = await tx.order.findUnique({ where: { id: candidate } });
            if (!exists) {
              newOrderId = candidate;
              break;
            }
          }

          const order = await tx.order.create({
            data: {
              id: newOrderId,
              trackingNumber: trackingNumber,
              merchantId: business.id,
              customerName: orderData.customerName,
              customerPhone: orderData.customerPhone,
              customerAddress: orderData.customerAddress,
              orderDate: new Date(),
              status: 'NEW',
              totalAmount: orderData.amount !== undefined ? orderData.amount : totalAmount,
              // Admin created orders go directly through - no allocation waiting
              fulfillmentWarehouseId: fulfillmentWarehouseId,
              OrderItem: {
                create: itemsToCreate.map(item => ({
                  id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  productId: item.productId,
                  quantity: item.quantity
                }))
              }
            },
            include: {
              OrderItem: {
                include: {
                  Product: {
                    select: { name: true, sku: true }
                  }
                }
              }
            }
          }) as {
            id: string;
            trackingNumber: string;
            customerName: string;
            totalAmount: number;
            OrderItem: { id: string; productId: string; quantity: number; Product: { name: string; sku: string } }[];
          };

          // Update stock allocations
          for (const stockUpdate of stockUpdates) {
            await tx.stockAllocation.update({
              where: { id: stockUpdate.allocationId },
              data: { allocatedQuantity: stockUpdate.newQuantity }
            });
          }

          createdOrders.push({
            orderId: order.id,
            trackingNumber: order.trackingNumber,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            itemCount: Array.isArray((order as any).OrderItem) ? (order as any).OrderItem.length : (itemsToCreate?.length || 0)
          });
        });

      } catch (error) {
        console.error(`Failed to create order for ${orderData.customerName}:`, error);
        failedOrders.push({
          customerName: orderData.customerName,
          businessName: orderData.businessName,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRequested: orders.length,
        successful: createdOrders.length,
        failed: failedOrders.length
      },
      createdOrders,
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined
    });

  } catch (error) {
    console.error('Error creating bulk orders:', error);
    return NextResponse.json(
      { error: 'Failed to create orders' },
      { status: 500 }
    );
  }
}