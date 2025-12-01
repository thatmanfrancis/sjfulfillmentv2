import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { generateUniqueTrackingNumber } from '@/lib/tracking';

interface OrderItem {
  sku: string;
  quantity: number;
}

interface ManualOrderData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  businessName: string;
  items: OrderItem[];
  manualTotalAmount?: number;
  note?: string | null;
  cost?: number;
  amount?: number;
  notes?: string | null;
  priceTierGroupId?: string;
  priceTierBreakdown?: any;
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

    const orderData: ManualOrderData = await request.json();
        // If frontend sends 'cost', use it for totalAmount
        if (typeof orderData.cost === 'number' && !isNaN(orderData.cost)) {
          orderData.manualTotalAmount = orderData.cost;
        }
    // If frontend sends 'note', map to backend 'notes'
    if (orderData.note && !orderData.notes) {
      orderData.notes = orderData.note;
    }

    // Validate required fields
    if (!orderData.customerName || !orderData.customerPhone || 
        !orderData.customerAddress || !orderData.businessName || 
        !orderData.items || orderData.items.length === 0) {
      return NextResponse.json({ error: "All order fields are required" }, { status: 400 });
    }

    // Deduplicate products in items (sum quantities for same SKU)
    const dedupedItemsMap = new Map<string, { sku: string; quantity: number }>();
    for (const item of orderData.items) {
      const sku = item.sku.toLowerCase();
      if (dedupedItemsMap.has(sku)) {
        dedupedItemsMap.get(sku)!.quantity += item.quantity;
      } else {
        dedupedItemsMap.set(sku, { sku, quantity: item.quantity });
      }
    }
    const dedupedItems = Array.from(dedupedItemsMap.values());

    // Create the order using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find business
      const business = await tx.business.findFirst({
        where: { 
          name: {
            equals: orderData.businessName,
            mode: 'insensitive'
          }
        }
      });

      if (!business) {
        throw new Error(`Business "${orderData.businessName}" not found`);
      }

      // Validate products and stock
      let totalAmount = 0;
      let priceTierSum = 0;
      const itemsToCreate = [];
      const stockUpdates = [];
      let missingPrice = false;

      for (const item of dedupedItems) {
        const product = await tx.product.findFirst({
          where: { 
            sku: {
              equals: item.sku,
              mode: 'insensitive'
            }
          },
          include: {
            StockAllocation: true
          }
        });

        if (!product) {
          throw new Error(`Product with SKU "${item.sku}" not found`);
        }

        // Check stock availability
        const totalAvailableStock = product.StockAllocation
          .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);

        if (totalAvailableStock < item.quantity) {
          throw new Error(`Insufficient stock for product "${item.sku}". Available: ${totalAvailableStock}, Required: ${item.quantity}`);
        }

        // Find the best warehouse allocation (highest stock first)
        const sortedAllocations = product.StockAllocation
          .filter(allocation => allocation.allocatedQuantity > 0)
          .sort((a, b) => b.allocatedQuantity - a.allocatedQuantity);

        let remainingQuantity = item.quantity;
        for (const allocation of sortedAllocations) {
          if (remainingQuantity <= 0) break;

          const quantityToTake = Math.min(remainingQuantity, allocation.allocatedQuantity);

          stockUpdates.push({
            allocationId: allocation.id,
            currentQuantity: allocation.allocatedQuantity,
            newQuantity: allocation.allocatedQuantity - quantityToTake,
            warehouseId: allocation.warehouseId
          });

          remainingQuantity -= quantityToTake;
        }

        itemsToCreate.push({
          productId: product.id,
          quantity: item.quantity
        });
      }

      // Calculate totalAmount as sum of priceTierSum, amount, and cost
      totalAmount = 0;
      if (typeof orderData.amount === 'number' && !isNaN(orderData.amount)) {
        totalAmount += orderData.amount;
      }
      if (typeof orderData.cost === 'number' && !isNaN(orderData.cost)) {
        totalAmount += orderData.cost;
      }
      if (typeof orderData.manualTotalAmount === 'number') {
        totalAmount = orderData.manualTotalAmount;
      }

      // Create the order
      // Build priceTierBreakdown and priceTierGroupId
      let priceTierBreakdown: any = null;
      let priceTierGroupId: string | null = null;
      if (orderData.priceTierGroupId) {
        priceTierGroupId = orderData.priceTierGroupId;
      }
      // If priceTierGroupId is provided, build breakdown from items
      if (priceTierGroupId && itemsToCreate.length > 0) {
        priceTierBreakdown = itemsToCreate.map(item => ({ sku: item.productId, quantity: item.quantity }));
      }
      const order = await tx.order.create({
        data: {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          trackingNumber: await generateUniqueTrackingNumber(),
          merchantId: business.id,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          orderDate: new Date(),
          status: 'NEW',
          totalAmount: totalAmount,
          fulfillmentWarehouseId: stockUpdates[0]?.warehouseId || null,
          notes: orderData.notes || null,
          priceTierGroupId,
          priceTierBreakdown,
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
                select: { name: true, sku: true, price: true }
              }
            }
          },
          Business: {
            select: { name: true, baseCurrency: true, id: true }
          }
        }
      });

      // Update stock allocations
      for (const stockUpdate of stockUpdates) {
        await tx.stockAllocation.update({
          where: { id: stockUpdate.allocationId },
          data: { allocatedQuantity: stockUpdate.newQuantity }
        });
      }

      return order;
    });

    // Send notification to merchant users when order is created
    const merchantUsers = await prisma.user.findMany({
      where: {
        businessId: result.merchantId,
        role: { in: ["MERCHANT", "MERCHANT_STAFF"] }
      }
    });
    await Promise.all(
      merchantUsers.map(user =>
        prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            title: "Order Created",
            message: `Order #${result.trackingNumber} has been created for your business and is now active.`,
            type: "INFO",
            audienceType: "MERCHANT",
            isRead: false,
            sendEmail: false,
            createdById: session.userId,
            linkUrl: `/merchant/orders/${result.id}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })
      )
    );
    return NextResponse.json({
      success: true,
      order: {
        id: result.id,
        customerName: result.customerName,
        businessName: result.Business.name,
        baseCurrency: result.Business.baseCurrency,
        totalAmount: result.totalAmount,
        status: result.status,
        itemCount: result.OrderItem.length,
        priceTierGroupId: result.priceTierGroupId,
        priceTierBreakdown: result.priceTierBreakdown,
        items: result.OrderItem.map(item => ({
          sku: item.Product.sku,
          productName: item.Product.name,
          quantity: item.quantity,
          price: item.Product.price,
          currency: result.Business.baseCurrency
        }))
      }
    });

  } catch (error) {
    console.error('Error creating manual order:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create order'
    }, { status: 500 });
  }
}