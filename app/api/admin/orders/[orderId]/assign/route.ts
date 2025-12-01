import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const body = await _req.json();
    const { logisticsId, warehousePicks, note } = body;
    if (!logisticsId) {
      return Response.json({ error: 'Missing logisticsId' }, { status: 400 });
    }
    const { orderId } = await ctx.params;
    if (!orderId) {
      return Response.json({ error: 'Missing orderId param' }, { status: 400 });
    }

    // Validate warehousePicks: [{ productId, picks: [{ warehouseId, quantity }] }]
    if (!Array.isArray(warehousePicks)) {
      return Response.json({ error: 'Missing or invalid warehousePicks' }, { status: 400 });
    }

    // Fetch order and items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: true,
        Business: true
      }
    });
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate picks for each item
    for (const item of order.OrderItem) {
      const pick = warehousePicks.find((wp: any) => wp.productId === item.productId);
      if (!pick) {
        return Response.json({ error: `Missing warehouse picks for product ${item.productId}` }, { status: 400 });
      }
      const totalPicked = (pick.picks || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
      if (totalPicked !== item.quantity) {
        return Response.json({ error: `Total picked for product ${item.productId} does not match order quantity` }, { status: 400 });
      }
      // Validate stock for each warehouse
      for (const p of pick.picks || []) {
        const alloc = await prisma.stockAllocation.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: p.warehouseId
            }
          }
        });
        if (!alloc || alloc.allocatedQuantity < p.quantity) {
          return Response.json({ error: `Insufficient stock for product ${item.productId} in warehouse ${p.warehouseId}` }, { status: 400 });
        }
      }
    }

    // Decrement stock allocations and save warehouse picks
    for (const item of order.OrderItem) {
      const pick = warehousePicks.find((wp: any) => wp.productId === item.productId);
      for (const p of pick.picks || []) {
        await prisma.stockAllocation.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: p.warehouseId
            }
          },
          data: {
            allocatedQuantity: {
              decrement: p.quantity
            }
          }
        });
      }
      // Save all picks for this product in one go for logistics visibility
      if (pick && Array.isArray(pick.picks)) {
        for (const p of pick.picks) {
          await prisma.orderWarehousePick.create({
            data: {
              orderId,
              productId: item.productId,
              warehouseId: p.warehouseId,
              quantity: p.quantity
            }
          });
        }
      }
    }

    // Assign logistics and update status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedLogisticsId: logisticsId,
        status: 'ASSIGNED_TO_LOGISTICS',
        notes: typeof note === 'string' ? note.trim() : undefined,
      },
    });

    // Generate tracking number (e.g., SJ_02_x5)
    function generateTrackingNumber(orderId: string) {
      // Example: SJ_<day>_<shortId>
      const day = new Date().getDate().toString().padStart(2, '0');
      const shortId = orderId.slice(-3);
      return `SJ_${day}_${shortId}`;
    }

    const trackingNumber = generateTrackingNumber(orderId);

    // Create a shipment if it doesn't exist for this order
    const existingShipment = await prisma.shipment.findUnique({ where: { orderId } });
    if (!existingShipment) {
      // Calculate shipment price: sum of price tier breakdown + order totalAmount
      let shipmentPrice = 0;
      let currency = order.Business?.baseCurrency || 'NGN';
      // Fetch full price tier breakdown with SKU and product name
      let breakdown: Array<{ sku: string; productName: string; amount: number; quantity: number }> = [];
      if (order.priceTierGroupId) {
        const pricingTiers = await prisma.pricingTier.findMany({
          where: { groupId: order.priceTierGroupId }
        });
        if (Array.isArray(pricingTiers)) {
          breakdown = [];
          for (const tier of pricingTiers) {
            let productName = '';
            let sku = '';
            if (tier.productId) {
              const product = await prisma.product.findUnique({ where: { id: tier.productId } });
              productName = product?.name || '';
              sku = product?.sku || '';
            }
            breakdown.push({
              sku,
              productName,
              amount: tier.negotiatedRate ?? tier.baseRate,
              quantity: tier.quantity ?? 1
            });
          }
          shipmentPrice += breakdown.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        }
      }
      // Add order totalAmount
      if (typeof order.totalAmount === 'number') shipmentPrice += order.totalAmount;

      await prisma.shipment.create({
        data: {
          id: (globalThis.crypto ?? require('crypto')).randomUUID(),
          Order: { connect: { id: orderId } },
          trackingNumber,
          lastStatusUpdate: new Date(),
          notes: typeof note === 'string' ? note.trim() : undefined,
          price: shipmentPrice,
          currency,
          priceTierBreakdown: breakdown.length ? breakdown : undefined,
        },
      });
      // Also update order with tracking number
      await prisma.order.update({
        where: { id: orderId },
        data: { trackingNumber, priceTierBreakdown: breakdown.length ? breakdown : undefined }
      });
      // Create invoice for merchant
      await prisma.invoice.create({
        data: {
          id: (globalThis.crypto ?? require('crypto')).randomUUID(),
          merchantId: order.merchantId,
          billingPeriod: `${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}`,
          totalDue: shipmentPrice,
          fulfillmentFees: 0,
          storageCharges: 0,
          receivingFees: 0,
          otherFees: 0,
          dueDate: new Date(Date.now() + 7*24*60*60*1000),
          status: "ISSUED",
          orderId: orderId,
          priceTierGroupId: order.priceTierGroupId ?? undefined,
          priceTierBreakdown: order.priceTierBreakdown ?? undefined,
        }
      });
    } else {
      // If shipment exists, update its notes and tracking number if missing
      await prisma.shipment.update({
        where: { orderId },
        data: {
          notes: typeof note === 'string' ? note.trim() : undefined,
          trackingNumber: existingShipment.trackingNumber || trackingNumber
        }
      });
      // Also update order with tracking number if missing
      if (!updated.trackingNumber) {
        await prisma.order.update({
          where: { id: orderId },
          data: { trackingNumber }
        });
      }
    }

    return Response.json({ success: true, order: updated });
  } catch (error) {
    console.error('Assign logistics error:', error);
    return Response.json({ error: 'Failed to assign logistics' }, { status: 500 });
  }
}
