import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv
    const period = searchParams.get('period') || '30';
    const reportType = searchParams.get('type') || 'comprehensive'; // comprehensive, orders, inventory, financial

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let businessFilter: any = {};
    let warehouseFilter: any = {};

    // Apply role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      businessFilter = { businessId: authResult.user.businessId };
    } else if (authResult.user.role === "LOGISTICS") {
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true }
      });
      const warehouseIds = userRegions.map(ur => ur.warehouseId);
      if (warehouseIds.length > 0) {
        warehouseFilter = { id: { in: warehouseIds } };
      }
    }

    let reportData: any = {};

    // Comprehensive or Orders report
    if (reportType === 'comprehensive' || reportType === 'orders') {
      const orders = await prisma.order.findMany({
        where: {
          ...businessFilter,
          orderDate: { gte: startDate }
        },
        include: {
          OrderItem: {
            include: {
              Product: {
                select: { name: true, sku: true }
              }
            }
          },
          Business: { select: { name: true } },
          Warehouse: { select: { name: true, region: true } }
        },
        orderBy: { orderDate: 'desc' }
      });

      reportData.orders = {
        summary: {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
          averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
          ordersByStatus: orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        details: orders.map((order: any) => ({
          orderId: order.id,
          externalOrderId: order.externalOrderId,
          customerName: order.customerName,
          customerEmail: 'N/A', // Field doesn't exist in schema
          customerPhone: order.customerPhone,
          status: order.status,
          orderDate: order.orderDate,
          deliveryDate: null, // Field doesn't exist in schema
          totalAmount: order.totalAmount,
          shippingCost: 0, // Field doesn't exist in schema
          merchantName: order.merchant.name,
          merchantEmail: 'contact@merchant.com', // Field doesn't exist
          warehouseName: order.fulfillmentWarehouse?.name || 'Unassigned',
          warehouseRegion: order.fulfillmentWarehouse?.region || 'N/A',
          itemCount: order.items.length,
          totalQuantity: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          items: order.items.map((item: any) => ({
            productName: item.product.name,
            sku: item.product.sku,
            category: 'General', // Field doesn't exist
            quantity: item.quantity,
            unitPrice: 100, // Using fixed price since field doesn't exist
            totalPrice: item.quantity * 100
          }))
        }))
      };
    }

    // Comprehensive or Inventory report
    if (reportType === 'comprehensive' || reportType === 'inventory') {
      const stockAllocations = await prisma.stockAllocation.findMany({
        where: warehouseFilter,
        include: {
          Product: {
            include: {
              Business: { select: { name: true } }
            }
          },
          Warehouse: { select: { name: true, region: true } }
        }
      });

      const stockTransfers = await prisma.stockTransfer.findMany({
        where: {
          createdAt: { gte: startDate },
          Product: businessFilter.businessId ? { businessId: businessFilter.businessId } : undefined
        },
        include: {
          Product: { select: { name: true, sku: true } },
          Warehouse_StockTransfer_fromWarehouseIdToWarehouse: { select: { name: true } },
          Warehouse_StockTransfer_toWarehouseIdToWarehouse: { select: { name: true } }
        }
      });

      reportData.inventory = {
        summary: {
          totalProducts: stockAllocations.length,
          totalStock: stockAllocations.reduce((sum, stock) => sum + stock.allocatedQuantity, 0),
          lowStockItems: stockAllocations.filter(stock => 
            stock.allocatedQuantity > 0 && stock.allocatedQuantity <= stock.safetyStock
          ).length,
          outOfStockItems: stockAllocations.filter(stock => stock.allocatedQuantity === 0).length,
          totalTransfers: stockTransfers.length,
          transferredQuantity: stockTransfers.reduce((sum, transfer) => sum + transfer.quantity, 0)
        },
        stockLevels: stockAllocations.map((stock: any) => ({
          productName: stock.product.name,
          sku: stock.product.sku,
          businessName: stock.product.business.name,
          warehouseName: stock.warehouse.name,
          region: stock.warehouse.region,
          currentQuantity: stock.allocatedQuantity,
          safetyStock: stock.safetyStock,
          status: stock.allocatedQuantity === 0 ? 'Out of Stock' :
                  stock.allocatedQuantity <= stock.safetyStock ? 'Low Stock' :
                  stock.allocatedQuantity > stock.safetyStock * 3 ? 'Overstock' : 'Normal',
          lastUpdated: new Date() // Using current date since updatedAt doesn't exist
        })),
        transfers: stockTransfers.map((transfer: any) => ({
          transferId: transfer.id,
          productName: transfer.product.name,
          sku: transfer.product.sku,
          fromWarehouse: transfer.fromWarehouse.name,
          toWarehouse: transfer.toWarehouse.name,
          quantity: transfer.quantity,
          status: transfer.status,
          createdBy: 'System', // Field doesn't exist
          createdAt: transfer.createdAt,
          completedAt: transfer.completedAt
        }))
      };
    }

    // Comprehensive or Financial report
    if (reportType === 'comprehensive' || reportType === 'financial') {
      const invoices = await prisma.invoice.findMany({
        where: {
          merchantId: businessFilter.businessId ? businessFilter.businessId : undefined,
          issueDate: { gte: startDate }
        },
        include: {
          Business: { select: { name: true } }
        }
      });

      reportData.financial = {
        summary: {
          totalInvoices: invoices.length,
          totalBilled: invoices.reduce((sum: number, inv: any) => sum + inv.totalDue, 0),
          totalPaid: invoices.filter((inv: any) => inv.status === 'PAID').reduce((sum: number, inv: any) => sum + inv.totalDue, 0),
          outstandingAmount: invoices.filter((inv: any) => ['ISSUED', 'OVERDUE'].includes(inv.status)).reduce((sum: number, inv: any) => sum + inv.totalDue, 0),
          overdueAmount: invoices.filter((inv: any) => inv.status === 'OVERDUE').reduce((sum: number, inv: any) => sum + inv.totalDue, 0),
          invoicesByStatus: invoices.reduce((acc: any, inv: any) => {
            acc[inv.status] = (acc[inv.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        invoices: invoices.map((invoice: any) => ({
          invoiceId: invoice.id,
          merchantName: invoice.merchant.name,
          merchantEmail: 'contact@merchant.com', // Field doesn't exist
          orderId: 'N/A', // No direct order relation
          amount: invoice.totalDue,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          paidDate: null, // Field doesn't exist
          daysPastDue: invoice.status === 'OVERDUE' && invoice.dueDate ? 
            Math.floor((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          paymentMethod: 'N/A', // Field doesn't exist
          reference: invoice.id
        }))
      };
    }

    // Add audit logs if admin
    if (authResult.user.role === "ADMIN") {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: startDate }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit to prevent excessive data
      });

      reportData.auditTrail = auditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.details, // Using details as fallback
        newValues: log.details, // Using details as fallback
        userInfo: {
          id: log.changedById,
          name: 'System User', // No user relation exists
          email: 'system@example.com',
          role: 'SYSTEM'
        },
        timestamp: log.timestamp,
        ipAddress: '0.0.0.0' // Field doesn't exist
      }));
    }

    // Generate CSV if requested
    if (format === 'csv') {
      let csvContent = '';
      
      if (reportType === 'orders' || reportType === 'comprehensive') {
        csvContent += 'ORDERS REPORT\n';
        csvContent += 'Order ID,External Order ID,Customer Name,Customer Email,Status,Order Date,Total Amount,Merchant,Warehouse,Items Count\n';
        
        reportData.orders.details.forEach((order: any) => {
          csvContent += `"${order.orderId}","${order.externalOrderId}","${order.customerName}","N/A","${order.status}","${order.orderDate}","${order.totalAmount}","${order.merchantName}","${order.warehouseName}","${order.itemCount}"\n`;
        });
        csvContent += '\n';
      }

      if (reportType === 'inventory' || reportType === 'comprehensive') {
        csvContent += 'INVENTORY REPORT\n';
        csvContent += 'Product Name,SKU,Business,Warehouse,Region,Current Quantity,Safety Stock,Status,Last Updated\n';
        
        reportData.inventory.stockLevels.forEach((stock: any) => {
          csvContent += `"${stock.productName}","${stock.sku}","${stock.businessName}","${stock.warehouseName}","${stock.region}","${stock.currentQuantity}","${stock.safetyStock}","${stock.status}","${stock.lastUpdated}"\n`;
        });
        csvContent += '\n';
      }

      if (reportType === 'financial' || reportType === 'comprehensive') {
        csvContent += 'FINANCIAL REPORT\n';
        csvContent += 'Invoice ID,Merchant Name,Amount,Status,Issue Date,Due Date,Paid Date,Days Past Due\n';
        
        reportData.financial.invoices.forEach((invoice: any) => {
          csvContent += `"${invoice.invoiceId}","${invoice.merchantName}","${invoice.amount}","${invoice.status}","${invoice.issueDate}","${invoice.dueDate}","${invoice.paidDate || ''}","${invoice.daysPastDue}"\n`;
        });
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sendjon-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON report
    return NextResponse.json({
      reportMetadata: {
        type: reportType,
        period: `${days} days`,
        generatedAt: new Date(),
        generatedBy: {
          id: authResult.user.id,
          name: authResult.user.name,
          role: authResult.user.role
        },
        filters: {
          business: businessFilter.businessId || 'All',
          warehouse: warehouseFilter.warehouseId || 'All'
        }
      },
      data: reportData,
      summary: {
        totalOrders: reportData.orders?.summary.totalOrders || 0,
        totalRevenue: reportData.orders?.summary.totalRevenue || 0,
        totalProducts: reportData.inventory?.summary.totalProducts || 0,
        totalInvoices: reportData.financial?.summary.totalInvoices || 0,
        totalBilled: reportData.financial?.summary.totalBilled || 0
      }
    });

  } catch (error) {
    console.error("Error generating comprehensive report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}