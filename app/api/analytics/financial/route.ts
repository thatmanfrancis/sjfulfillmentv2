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
    const period = searchParams.get('period') || '30';
    const currency = searchParams.get('currency') || 'NGN';
    const includeProjections = searchParams.get('projections') === 'true';

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let businessFilter: any = {};
    
    // Apply role-based filtering
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      businessFilter = { businessId: authResult.user.businessId };
    } else if (authResult.user.role === "LOGISTICS") {
      // Logistics region filtering disabled for now
      // TODO: Re-implement when logistics regions are properly configured
      const accessibleWarehouses: string[] = []; // No warehouse restrictions for now
      // Logistics users see aggregated data for their regions
    }

    // Get exchange rate
    let exchangeRate = 1;
    if (currency !== 'NGN') {
      try {
        exchangeRate = await CurrencyService.getExchangeRate('NGN', currency);
      } catch (error) {
        console.warn('Failed to get exchange rate, using NGN');
      }
    }

    // Fetch financial data
    const [
      orders,
      invoices,
      stockTransfers,
      businesses,
      warehouses
    ] = await Promise.all([
      // Orders for revenue analysis
      prisma.order.findMany({
        where: {
          ...businessFilter,
          orderDate: { gte: startDate }
        },
        include: {
          OrderItem: {
            include: {
              Product: {
                select: { businessId: true }
              }
            }
          },
          Business: { select: { name: true } }
        }
      }),

      // Invoices for billing analysis - disabled until business relation is added
      // prisma.invoice.findMany({
      //   where: {
      //     business: businessFilter.businessId ? { id: businessFilter.businessId } : undefined,
      //     issueDate: { gte: startDate }
      //   },
      //   include: {
      //     business: { select: { name: true } }
      //   }
      // }),
      Promise.resolve([]),

      // Stock transfers - disabled until stockTransfer table exists
      Promise.resolve([]),

      // Business overview
      businessFilter.businessId 
        ? prisma.business.findUnique({
            where: { id: businessFilter.businessId },
            select: { name: true, id: true }
          })
        : prisma.business.findMany({
            select: { name: true, id: true }
          }),

      // Warehouse operational costs (simplified)
      authResult.user.role === "ADMIN" 
        ? prisma.warehouse.findMany({})
        : []
    ]);

    // Revenue Analysis
    const revenueAnalysis = {
      totalRevenue: 0,
      revenueByStatus: {} as Record<string, number>,
      revenueByBusiness: {} as Record<string, number>,
      revenueByCategory: {} as Record<string, number>,
      dailyRevenue: {} as Record<string, number>
    };

    orders.forEach((order: any) => {
      const revenue = order.totalAmount * exchangeRate;
      const date = order.orderDate.toISOString().split('T')[0];
      
      revenueAnalysis.totalRevenue += revenue;
      revenueAnalysis.revenueByStatus[order.status] = 
        (revenueAnalysis.revenueByStatus[order.status] || 0) + revenue;
      revenueAnalysis.revenueByBusiness[order.Business?.name || 'Unknown'] = 
        (revenueAnalysis.revenueByBusiness[order.Business?.name || 'Unknown'] || 0) + revenue;
      revenueAnalysis.dailyRevenue[date] = 
        (revenueAnalysis.dailyRevenue[date] || 0) + revenue;

      // Category breakdown - using 'General' as default since category field doesn't exist
      order.OrderItem.forEach((item: any) => {
        const category = 'General';
        const itemRevenue = item.quantity * 100 * exchangeRate; // Using fixed price
        revenueAnalysis.revenueByCategory[category] = 
          (revenueAnalysis.revenueByCategory[category] || 0) + itemRevenue;
      });
    });

    // Cost Analysis
    const costAnalysis = {
      totalCosts: 0,
      operationalCosts: 0,
      transferCosts: 0,
      warehouseCosts: 0,
      costByWarehouse: {} as Record<string, number>
    };

    // Calculate transfer costs (simplified - using fixed cost since purchaseCost doesn't exist)
    stockTransfers.forEach((transfer: any) => {
      const transferCost = transfer.quantity * 50; // Fixed cost per unit
      costAnalysis.transferCosts += transferCost;
      costAnalysis.totalCosts += transferCost;
    });

    // Simplified warehouse operational costs (₦100 per order processed)
    const costPerOrder = 100 * exchangeRate;
    warehouses.forEach((warehouse: any) => {
      const warehouseCost = warehouse._count.fulfilledOrders * costPerOrder;
      costAnalysis.warehouseCosts += warehouseCost;
      costAnalysis.costByWarehouse[warehouse.name] = warehouseCost;
    });

    costAnalysis.operationalCosts = costAnalysis.warehouseCosts + costAnalysis.transferCosts;
    costAnalysis.totalCosts = costAnalysis.operationalCosts;

    // Profit Analysis
    const profitAnalysis = {
      grossProfit: revenueAnalysis.totalRevenue - costAnalysis.totalCosts,
      profitMargin: revenueAnalysis.totalRevenue > 0 
        ? ((revenueAnalysis.totalRevenue - costAnalysis.totalCosts) / revenueAnalysis.totalRevenue) * 100 
        : 0,
      dailyProfit: {} as Record<string, number>
    };

    // Calculate daily profit (simplified)
    Object.entries(revenueAnalysis.dailyRevenue).forEach(([date, revenue]) => {
      const dailyCost = costAnalysis.totalCosts / days; // Simplified daily cost
      profitAnalysis.dailyProfit[date] = revenue - dailyCost;
    });

    // Invoice Analysis
    const invoiceAnalysis = {
      totalBilled: 0,
      totalPaid: 0,
      outstandingAmount: 0,
      overdueAmount: 0,
      paymentRate: 0,
      averagePaymentTime: 0,
      invoicesByStatus: {} as Record<string, { count: number, amount: number }>
    };

    let totalPaymentDays = 0;
    let paidInvoicesCount = 0;

    invoices.forEach((invoice: any) => {
      const amount = invoice.totalDue * exchangeRate;
      
      invoiceAnalysis.totalBilled += amount;
      
      if (!invoiceAnalysis.invoicesByStatus[invoice.status]) {
        invoiceAnalysis.invoicesByStatus[invoice.status] = { count: 0, amount: 0 };
      }
      invoiceAnalysis.invoicesByStatus[invoice.status].count += 1;
      invoiceAnalysis.invoicesByStatus[invoice.status].amount += amount;

      if (invoice.status === 'PAID') {
        invoiceAnalysis.totalPaid += amount;
        // Note: paidDate field doesn't exist in schema, using fixed payment time
        const paymentDays = 15; // Average payment time
        totalPaymentDays += paymentDays;
        paidInvoicesCount += 1;
      } else if (invoice.status === 'OVERDUE') {
        invoiceAnalysis.overdueAmount += amount;
      }
      
      if (['ISSUED', 'OVERDUE'].includes(invoice.status)) {
        invoiceAnalysis.outstandingAmount += amount;
      }
    });

    invoiceAnalysis.paymentRate = invoiceAnalysis.totalBilled > 0 
      ? (invoiceAnalysis.totalPaid / invoiceAnalysis.totalBilled) * 100 
      : 0;
    
    invoiceAnalysis.averagePaymentTime = paidInvoicesCount > 0 
      ? totalPaymentDays / paidInvoicesCount 
      : 0;

    // Cash Flow Analysis
    const cashFlowAnalysis = {
      netCashFlow: invoiceAnalysis.totalPaid - costAnalysis.totalCosts,
      operatingCashFlow: revenueAnalysis.totalRevenue - costAnalysis.operationalCosts,
      receivablesTurnover: invoiceAnalysis.totalBilled > 0 && invoiceAnalysis.outstandingAmount > 0
        ? invoiceAnalysis.totalBilled / invoiceAnalysis.outstandingAmount
        : 0,
      daysOutstanding: invoiceAnalysis.averagePaymentTime
    };

    // Financial Projections (if requested)
    let projections = null;
    if (includeProjections) {
      const dailyRevenueValues = Object.values(revenueAnalysis.dailyRevenue);
      const avgDailyRevenue = dailyRevenueValues.length > 0 
        ? dailyRevenueValues.reduce((sum, rev) => sum + rev, 0) / dailyRevenueValues.length
        : 0;
      
      const avgDailyCost = costAnalysis.totalCosts / days;

      projections = {
        next30Days: {
          projectedRevenue: avgDailyRevenue * 30,
          projectedCosts: avgDailyCost * 30,
          projectedProfit: (avgDailyRevenue - avgDailyCost) * 30,
          formattedProjectedRevenue: CurrencyService.formatCurrency(avgDailyRevenue * 30, currency),
          formattedProjectedProfit: CurrencyService.formatCurrency((avgDailyRevenue - avgDailyCost) * 30, currency)
        },
        next90Days: {
          projectedRevenue: avgDailyRevenue * 90,
          projectedCosts: avgDailyCost * 90,
          projectedProfit: (avgDailyRevenue - avgDailyCost) * 90,
          formattedProjectedRevenue: CurrencyService.formatCurrency(avgDailyRevenue * 90, currency),
          formattedProjectedProfit: CurrencyService.formatCurrency((avgDailyRevenue - avgDailyCost) * 90, currency)
        }
      };
    }

    // Financial Health Metrics
    const healthMetrics = {
      profitabilityScore: Math.min(100, Math.max(0, profitAnalysis.profitMargin * 2)), // 50% margin = 100 score
      liquidityScore: Math.min(100, Math.max(0, (invoiceAnalysis.paymentRate - 50) * 2)), // 100% payment rate = 100 score
      efficiencyScore: Math.min(100, Math.max(0, 100 - invoiceAnalysis.averagePaymentTime * 2)), // 0 days = 100 score
      overallScore: 0
    };
    
    healthMetrics.overallScore = (healthMetrics.profitabilityScore + healthMetrics.liquidityScore + healthMetrics.efficiencyScore) / 3;

    return NextResponse.json({
      overview: {
        period: `${days} days`,
        currency,
        exchangeRate: currency !== 'NGN' ? exchangeRate : undefined,
        generatedAt: new Date(),
        healthScore: Math.round(healthMetrics.overallScore)
      },

      revenue: {
        ...revenueAnalysis,
        totalRevenue: Math.round(revenueAnalysis.totalRevenue * 100) / 100,
        formattedTotal: CurrencyService.formatCurrency(revenueAnalysis.totalRevenue, currency),
        averageDaily: Math.round((revenueAnalysis.totalRevenue / days) * 100) / 100,
        formattedAverageDaily: CurrencyService.formatCurrency(revenueAnalysis.totalRevenue / days, currency)
      },

      costs: {
        ...costAnalysis,
        totalCosts: Math.round(costAnalysis.totalCosts * 100) / 100,
        formattedTotal: CurrencyService.formatCurrency(costAnalysis.totalCosts, currency),
        averageDaily: Math.round((costAnalysis.totalCosts / days) * 100) / 100,
        formattedAverageDaily: CurrencyService.formatCurrency(costAnalysis.totalCosts / days, currency)
      },

      profit: {
        ...profitAnalysis,
        grossProfit: Math.round(profitAnalysis.grossProfit * 100) / 100,
        formattedGrossProfit: CurrencyService.formatCurrency(profitAnalysis.grossProfit, currency),
        profitMargin: Math.round(profitAnalysis.profitMargin * 100) / 100
      },

      invoicing: {
        ...invoiceAnalysis,
        totalBilled: Math.round(invoiceAnalysis.totalBilled * 100) / 100,
        totalPaid: Math.round(invoiceAnalysis.totalPaid * 100) / 100,
        outstandingAmount: Math.round(invoiceAnalysis.outstandingAmount * 100) / 100,
        overdueAmount: Math.round(invoiceAnalysis.overdueAmount * 100) / 100,
        formattedTotalBilled: CurrencyService.formatCurrency(invoiceAnalysis.totalBilled, currency),
        formattedOutstanding: CurrencyService.formatCurrency(invoiceAnalysis.outstandingAmount, currency),
        paymentRate: Math.round(invoiceAnalysis.paymentRate * 100) / 100,
        averagePaymentTime: Math.round(invoiceAnalysis.averagePaymentTime * 100) / 100
      },

      cashFlow: {
        ...cashFlowAnalysis,
        netCashFlow: Math.round(cashFlowAnalysis.netCashFlow * 100) / 100,
        formattedNetCashFlow: CurrencyService.formatCurrency(cashFlowAnalysis.netCashFlow, currency),
        operatingCashFlow: Math.round(cashFlowAnalysis.operatingCashFlow * 100) / 100,
        formattedOperatingCashFlow: CurrencyService.formatCurrency(cashFlowAnalysis.operatingCashFlow, currency)
      },

      healthMetrics: {
        ...healthMetrics,
        overallScore: Math.round(healthMetrics.overallScore),
        profitabilityScore: Math.round(healthMetrics.profitabilityScore),
        liquidityScore: Math.round(healthMetrics.liquidityScore),
        efficiencyScore: Math.round(healthMetrics.efficiencyScore)
      },

      projections,

      insights: {
        alerts: [
          ...(profitAnalysis.profitMargin < 10 ? ['Low profit margin detected'] : []),
          ...(invoiceAnalysis.overdueAmount > invoiceAnalysis.totalBilled * 0.1 ? ['High overdue amount'] : []),
          ...(invoiceAnalysis.paymentRate < 80 ? ['Low payment collection rate'] : []),
          ...(invoiceAnalysis.averagePaymentTime > 30 ? ['Long average payment cycles'] : []),
          ...(cashFlowAnalysis.netCashFlow < 0 ? ['Negative cash flow'] : [])
        ],
        recommendations: [
          ...(invoiceAnalysis.paymentRate < 90 ? ['Implement payment reminders and follow-up processes'] : []),
          ...(profitAnalysis.profitMargin < 15 ? ['Review pricing strategy and cost optimization'] : []),
          ...(costAnalysis.transferCosts > revenueAnalysis.totalRevenue * 0.2 ? ['Optimize inventory transfer costs'] : []),
          ...(invoiceAnalysis.averagePaymentTime > 21 ? ['Consider offering early payment discounts'] : [])
        ]
      }
    });

  } catch (error) {
    console.error("Error generating financial analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}