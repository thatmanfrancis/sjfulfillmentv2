import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CurrencyService } from "@/lib/currency";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const lowStockThreshold = parseInt(searchParams.get('threshold') || '10');
    const format = searchParams.get('format') || 'json'; // json or csv
    const currency = searchParams.get('currency') || 'NGN';

    let where: any = {};

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      where.Product = { businessId: authResult.user.businessId };
    } else if (authResult.user.role === "LOGISTICS") {
      // Get logistics user's warehouses
      const userRegions = await prisma.logisticsRegion.findMany({
        where: { userId: authResult.user.id },
        select: { warehouseId: true },
      });
      const warehouseIds = userRegions.map(ur => ur.warehouseId);
      where.warehouseId = { in: warehouseIds };
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const stockAllocations = await prisma.stockAllocation.findMany({
      where,
      include: {
        Product: {
          select: {
            id: true,
            name: true,
            sku: true,
            weightKg: true,
            dimensions: true,
            Business: {
              select: {
                name: true,
                baseCurrency: true,
              }
            }
          }
        },
        Warehouse: {
          select: {
            id: true,
            name: true,
            region: true
          }
        }
      },
      orderBy: [
        { allocatedQuantity: 'asc' },
        { Product: { name: 'asc' } }
      ]
    });

    // Get exchange rate if different currency requested
    let exchangeRate = 1;
    if (currency !== 'NGN') {
      try {
        exchangeRate = await CurrencyService.getExchangeRate('NGN', currency);
      } catch (error) {
        console.warn('Failed to get exchange rate, using NGN');
      }
    }

    // Calculate availability metrics
    const availabilityData = stockAllocations.map(stock => {
      const totalStock = stock.allocatedQuantity + stock.safetyStock;
      const availableStock = Math.max(0, stock.allocatedQuantity - stock.safetyStock);
      const availablePercentage = totalStock > 0 ? (availableStock / totalStock) * 100 : 0;
      const isLowStock = availableStock <= lowStockThreshold;
      const isOutOfStock = availableStock === 0;

      // Calculate estimated value (this would need actual product pricing)
      const estimatedUnitValue = 1000; // Placeholder - would come from product data
      const estimatedValue = availableStock * estimatedUnitValue * exchangeRate;

      return {
        productId: stock.Product.id,
        productName: stock.Product.name,
        sku: stock.Product.sku,
        businessName: stock.Product.Business.name,
        businessCurrency: stock.Product.Business.baseCurrency,
        warehouseName: stock.Warehouse.name,
        warehouseRegion: stock.Warehouse.region,
        allocatedQuantity: stock.allocatedQuantity,
        safetyStock: stock.safetyStock,
        availableStock,
        totalStock,
        availablePercentage: Math.round(availablePercentage * 100) / 100,
        isLowStock,
        isOutOfStock,
        reorderSuggested: isLowStock && !isOutOfStock,
        weightKg: stock.Product.weightKg,
        dimensions: stock.Product.dimensions,
        estimatedValue,
        currency,
        exchangeRate: currency !== 'NGN' ? exchangeRate : undefined
      };
    });

    // Generate summary statistics
    const summary = {
      totalProducts: availabilityData.length,
      lowStockItems: availabilityData.filter(item => item.isLowStock).length,
      outOfStockItems: availabilityData.filter(item => item.isOutOfStock).length,
      wellStockedItems: availabilityData.filter(item => !item.isLowStock && !item.isOutOfStock).length,
      averageStockLevel: availabilityData.length > 0 
        ? availabilityData.reduce((sum, item) => sum + item.availablePercentage, 0) / availabilityData.length 
        : 0,
      totalEstimatedValue: availabilityData.reduce((sum, item) => sum + item.estimatedValue, 0),
      currency,
      generatedAt: new Date(),
      lowStockThreshold
    };

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'SKU', 'Product Name', 'Business', 'Business Currency', 'Warehouse', 'Region',
        'Available Stock', 'Allocated Stock', 'Safety Stock', 'Total Stock',
        'Availability %', 'Status', 'Weight (kg)', 'Dimensions', 
        `Estimated Value (${currency})`, 'Reorder Suggested'
      ].join(',');

      const csvRows = availabilityData.map(item => [
        item.sku,
        `"${item.productName}"`,
        `"${item.businessName}"`,
        item.businessCurrency,
        `"${item.warehouseName}"`,
        item.warehouseRegion,
        item.availableStock,
        item.allocatedQuantity,
        item.safetyStock,
        item.totalStock,
        item.availablePercentage.toFixed(2),
        item.isOutOfStock ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'Well Stocked',
        item.weightKg || 0,
        `"${JSON.stringify(item.dimensions) || ''}"`,
        item.estimatedValue.toFixed(2),
        item.reorderSuggested ? 'Yes' : 'No'
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="product-availability-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      summary,
      data: availabilityData,
      filters: {
        warehouseId,
        lowStockThreshold,
        currency,
        exchangeRate: currency !== 'NGN' ? exchangeRate : undefined,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Error generating availability report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}