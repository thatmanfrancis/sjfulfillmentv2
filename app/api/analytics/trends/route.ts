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
    const period = searchParams.get('period') || '90'; // days
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly
    const currency = searchParams.get('currency') || 'NGN';

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let businessFilter: any = {};
    let warehouseFilter: any = {};

    // Apply role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      businessFilter = { businessId: authResult.user.businessId };
    } else if (authResult.user.role === "LOGISTICS") {
      // Logistics region filtering disabled for now
      // TODO: Re-implement when logistics regions are properly configured
      warehouseFilter = {}; // No warehouse filtering for now
    }

    // Get exchange rate if needed
    let exchangeRate = 1;
    if (currency !== 'NGN') {
      try {
        exchangeRate = await CurrencyService.getExchangeRate('NGN', currency);
      } catch (error) {
        console.warn('Failed to get exchange rate, using NGN');
      }
    }

    // Get date grouping function based on granularity
    const getDateGroup = (date: Date): string => {
      switch (granularity) {
        case 'weekly':
          const week = new Date(date);
          week.setDate(date.getDate() - date.getDay());
          return week.toISOString().split('T')[0];
        case 'monthly':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        default:
          return date.toISOString().split('T')[0];
      }
    };

    // Fetch orders data for trend analysis
    const orders = await prisma.order.findMany({
      where: {
        ...businessFilter,
        orderDate: { gte: startDate }
      },
      include: {
        OrderItem: {
          include: {
            Product: {
              select: {
                id: true,
                name: true,
                sku: true,
                Business: { select: { name: true } }
              }
            }
          }
        },
        Business: { select: { name: true } },
        Warehouse: { select: { name: true, region: true } }
      },
      orderBy: { orderDate: 'asc' }
    });

    // Process order trends
    const orderTrends = orders.reduce((acc: any, order: any) => {
      const dateGroup = getDateGroup(order.orderDate);
      if (!acc[dateGroup]) {
        acc[dateGroup] = {
          date: dateGroup,
          orders: 0,
          revenue: 0,
          items: 0,
          averageOrderValue: 0,
          newOrders: 0,
          deliveredOrders: 0,
          canceledOrders: 0
        };
      }

      acc[dateGroup].orders += 1;
      acc[dateGroup].revenue += order.totalAmount * exchangeRate;
      acc[dateGroup].items += order.OrderItem.reduce((sum: number, item: any) => sum + item.quantity, 0);

      if (order.status === 'NEW') acc[dateGroup].newOrders += 1;
      if (order.status === 'DELIVERED') acc[dateGroup].deliveredOrders += 1;
      if (['CANCELED', 'RETURNED'].includes(order.status)) acc[dateGroup].canceledOrders += 1;

      return acc;
    }, {} as Record<string, any>);

    // Calculate average order values
    Object.values(orderTrends).forEach((trend: any) => {
      trend.averageOrderValue = trend.orders > 0 ? trend.revenue / trend.orders : 0;
    });

    // Product performance trends
    const productSales = orders.reduce((acc: any, order: any) => {
      const dateGroup = getDateGroup(order.orderDate);
      
      order.OrderItem.forEach((item: any) => {
        const key = `${item.Product.id}-${dateGroup}`;
        if (!acc[key]) {
          acc[key] = {
            productId: item.Product.id,
            product: item.Product,
            date: dateGroup,
            quantity: 0,
            revenue: 0
          };
        }
        acc[key].quantity += item.quantity;
        acc[key].revenue += item.quantity * 100 * exchangeRate; // Using fixed price
      });

      return acc;
    }, {} as Record<string, any>);

    // Group product trends by product
    const productTrends = Object.values(productSales).reduce((acc: any, sale: any) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = {
          product: sale.product,
          data: []
        };
      }
      acc[sale.productId].data.push({
        date: sale.date,
        quantity: sale.quantity,
        revenue: sale.revenue
      });
      return acc;
    }, {});

    // Top trending products
    const productSummary = Object.values(productTrends as Record<string, any>).map((trend: any) => {
      const trendProduct = trend.product || {};
      return {
        productName: trendProduct.name || 'Unknown',
        sku: trendProduct.sku || 'N/A',
        totalOrders: trend.data?.length || 0,
        totalQuantity: trend.data?.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0) || 0,
        revenue: trend.data?.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0) || 0,
        averageOrderValue: trend.data?.length > 0 ? 
          (trend.data.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0) / trend.data.length) : 0,
        trend: trend.data.length >= 2 ? 
          (trend.data[trend.data.length - 1].quantity - trend.data[0].quantity) / Math.max(trend.data[0].quantity, 1) * 100 : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Regional performance
    const regionalTrends = orders.reduce((acc: any, order: any) => {
      const region = order.fulfillmentWarehouse?.region || 'Unknown';
      const dateGroup = getDateGroup(order.orderDate);
      
      if (!acc[region]) {
        acc[region] = {};
      }
      if (!acc[region][dateGroup]) {
        acc[region][dateGroup] = {
          date: dateGroup,
          orders: 0,
          revenue: 0,
          items: 0
        };
      }

      acc[region][dateGroup].orders += 1;
      acc[region][dateGroup].revenue += order.totalAmount * exchangeRate;
      acc[region][dateGroup].items += order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

      return acc;
    }, {} as Record<string, any>);

    // Calculate growth rates
    const calculateGrowthRate = (data: any[]) => {
      if (data.length < 2) return 0;
      
      const periods = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, periods);
      const secondHalf = data.slice(-periods);
      
      const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.revenue, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.revenue, 0) / secondHalf.length;
      
      return firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    };

    const trendsData = Object.values(orderTrends);
    const growthRate = calculateGrowthRate(trendsData);

    // Seasonal patterns (if enough data)
    const seasonalPatterns = trendsData.length >= 28 ? {
      weeklyPattern: trendsData.reduce((acc: any, trend: any) => {
        const date = new Date(trend.date);
        const dayOfWeek = date.getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        
        if (!acc[dayName]) {
          acc[dayName] = { orders: 0, revenue: 0, count: 0 };
        }
        acc[dayName].orders += trend.orders;
        acc[dayName].revenue += trend.revenue;
        acc[dayName].count += 1;
        
        return acc;
      }, {}),
      
      monthlyPattern: granularity === 'monthly' && trendsData.length >= 12 ? 
        trendsData.reduce((acc: any, trend: any) => {
          const month = new Date(trend.date + '-01').toLocaleString('default', { month: 'long' });
          
          if (!acc[month]) {
            acc[month] = { orders: 0, revenue: 0, count: 0 };
          }
          acc[month].orders += trend.orders;
          acc[month].revenue += trend.revenue;
          acc[month].count += 1;
          
          return acc;
        }, {}) : null
    } : null;

    // Forecasting (simple linear trend)
    const getForecast = (data: any[], periods: number = 7) => {
      if (data.length < 3) return [];
      
      // Simple linear regression for revenue
      const x = data.map((_, i) => i);
      const y = data.map(d => d.revenue);
      
      const n = data.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      const forecast = [];
      for (let i = 1; i <= periods; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        const predictedRevenue = slope * (n + i) + intercept;
        
        forecast.push({
          date: getDateGroup(futureDate),
          predictedRevenue: Math.max(0, predictedRevenue),
          confidence: Math.max(0, 100 - (i * 10)) // Decreasing confidence
        });
      }
      
      return forecast;
    };

    return NextResponse.json({
      overview: {
        period: `${days} days`,
        granularity,
        currency,
        totalDataPoints: trendsData.length,
        growthRate: Math.round(growthRate * 100) / 100,
        generatedAt: new Date()
      },
      
      orderTrends: trendsData.map((trend: any) => {
        const trendData = trend as {
          date: string;
          totalOrders: number;
          totalQuantity: number;
          revenue: number;
          averageOrderValue: number;
        };
        
        return {
          ...trendData,
          revenue: Math.round(trendData.revenue * 100) / 100,
          averageOrderValue: Math.round(trendData.averageOrderValue * 100) / 100,
          formattedRevenue: CurrencyService.formatCurrency(trendData.revenue, currency),
          formattedAOV: CurrencyService.formatCurrency(trendData.averageOrderValue, currency)
        };
      }),
      
      productTrends: {
        topPerformers: productSummary
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map(p => ({
            ...p,
            totalRevenue: Math.round(p.revenue * 100) / 100,
            formattedRevenue: CurrencyService.formatCurrency(p.revenue, currency),
            trend: Math.round(p.trend * 100) / 100
          })),
        
        fastestGrowing: productSummary
          .filter(p => p.trend > 0)
          .sort((a, b) => b.trend - a.trend)
          .slice(0, 10)
          .map(p => ({
            ...p,
            totalRevenue: Math.round(p.revenue * 100) / 100,
            formattedRevenue: CurrencyService.formatCurrency(p.revenue, currency),
            trend: Math.round(p.trend * 100) / 100
          })),
        
        declining: productSummary
          .filter(p => p.trend < -5)
          .sort((a, b) => a.trend - b.trend)
          .slice(0, 10)
          .map(p => ({
            ...p,
            totalRevenue: Math.round(p.revenue * 100) / 100,
            formattedRevenue: CurrencyService.formatCurrency(p.revenue, currency),
            trend: Math.round(p.trend * 100) / 100
          }))
      },
      
      regionalTrends: Object.entries(regionalTrends).map(([region, data]: [string, any]) => ({
        region,
        data: Object.values(data).map((d: any) => ({
          ...d,
          revenue: Math.round(d.revenue * 100) / 100,
          formattedRevenue: CurrencyService.formatCurrency(d.revenue, currency)
        })),
        total: Object.values(data).reduce((sum: number, d: any) => sum + d.revenue, 0)
      })),
      
      seasonalPatterns,
      
      forecast: getForecast(trendsData).map(f => ({
        ...f,
        predictedRevenue: Math.round(f.predictedRevenue * 100) / 100,
        formattedPredictedRevenue: CurrencyService.formatCurrency(f.predictedRevenue, currency)
      })),
      
      insights: {
        trendDirection: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
        volatility: trendsData.length > 1 ? 
          Math.sqrt((trendsData as Array<{ revenue: number }>).reduce((sum: number, trend, i, arr) => {
            if (i === 0) return sum;
            const currentRevenue = trend.revenue;
            const previousRevenue = arr[i-1].revenue;
            const change = (currentRevenue - previousRevenue) / Math.max(previousRevenue, 1);
            return sum + change * change;
          }, 0) / (trendsData.length - 1)) * 100 : 0,
        
        recommendations: [
          ...(growthRate > 20 ? ['Strong growth detected - consider scaling operations'] : []),
          ...(growthRate < -10 ? ['Declining trend - investigate causes and implement retention strategies'] : []),
          ...(productSummary.filter(p => p.trend < -20).length > 0 ? ['Some products showing sharp decline - review pricing and demand'] : []),
          ...(seasonalPatterns?.weeklyPattern ? ['Leverage weekly patterns for inventory planning'] : []),
          ...(trendsData.some((t: any) => t.canceledOrders > t.deliveredOrders) ? ['High cancellation rate detected in some periods'] : [])
        ]
      }
    });

  } catch (error) {
    console.error("Error generating trend analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}