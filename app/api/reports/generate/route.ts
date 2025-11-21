import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import PDFDocument from 'pdfkit';
import { createAuditLog } from '@/lib/notifications';

interface ReportParameters {
  format: string;
  startDate: string;
  endDate: string;
  includeCharts: boolean;
  includeDetails: boolean;
  includeFinancials: boolean;
  groupBy: string;
  generatedAt: string;
  requestedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parameters = await request.json();
    const reportType = parameters.format || 'SALES';
    // Validate date range
    const startDate = new Date(parameters.startDate);
    const endDate = new Date(parameters.endDate);
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Invalid date range: End date must be after start date' },
        { status: 400 }
      );
    }
    // Generate unique report ID
    const reportId = `${reportType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Get data for the report based on type
    const reportData = await generateReportData(reportType, startDate, endDate, parameters);
    // Generate the actual report file
    const { fileBuffer, fileName } = await generateReportFile(reportType, reportData, parameters);
    // Create audit log
    await createAuditLog(
      session.userId,
      'Report',
      reportId,
      'REPORT_GENERATED',
      {
        reportType,
        startDate: parameters.startDate,
        endDate: parameters.endDate,
        format: parameters.format,
        includeCharts: parameters.includeCharts,
        includeDetails: parameters.includeDetails,
        includeFinancials: parameters.includeFinancials,
        groupBy: parameters.groupBy,
      }
    );
    const generatedReport = {
      id: reportId,
      name: `${getReportTypeName(reportType)} Report`,
      type: reportType.toUpperCase(),
      description: `${getReportTypeName(reportType)} report from ${parameters.startDate} to ${parameters.endDate}`,
      lastGenerated: new Date().toISOString(),
      generatedBy: session.userId,
      format: parameters.format,
      size: `${Math.round(fileBuffer.length / 1024)}KB`,
      fileName,
    };
    // For PDF files, we'll return the download URL
    // In a real implementation, you might save this to cloud storage
    const downloadUrl = `/api/reports/${reportId}/download`;
    return NextResponse.json({
      success: true,
      report: generatedReport,
      downloadUrl,
      message: `${getReportTypeName(reportType)} report generated successfully`,
      data: reportData, // Include summary data for immediate display
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function generateReportData(reportType: string, startDate: Date, endDate: Date, parameters: ReportParameters) {
  switch (reportType.toUpperCase()) {
    case 'SALES':
      return await generateSalesReportData(startDate, endDate, parameters);
    case 'INVENTORY':
      return await generateInventoryReportData(startDate, endDate, parameters);
    case 'MERCHANT':
      return await generateMerchantReportData(startDate, endDate, parameters);
    case 'LOGISTICS':
      return await generateLogisticsReportData(startDate, endDate, parameters);
    case 'FINANCIAL':
      return await generateFinancialReportData(startDate, endDate, parameters);
    case 'COMPREHENSIVE':
      return await generateComprehensiveReportData(startDate, endDate, parameters);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

async function generateSalesReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  // Get orders within date range
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      Business: {
        select: { id: true, name: true, baseCurrency: true },
      },
      OrderItem: {
        include: {
          Product: {
            select: { name: true, sku: true },
          },
        },
      },
    },
    orderBy: { orderDate: 'desc' },
  });

  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Group by period
  const groupedData = groupDataByPeriod(orders, parameters.groupBy, startDate, endDate);
  
  // Top merchants
  const merchantStats = orders.reduce((acc, order) => {
    if (!order.Business) return acc;
    const merchantId = order.Business.id;
    if (!acc[merchantId]) {
      acc[merchantId] = {
        id: merchantId,
        name: order.Business.name,
        orders: 0,
        revenue: 0,
      };
    }
    acc[merchantId].orders += 1;
    acc[merchantId].revenue += order.totalAmount || 0;
    return acc;
  }, {} as Record<string, any>);

  const topMerchants = Object.values(merchantStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  // Product performance
  const productStats = orders.reduce((acc, order) => {
    order.OrderItem.forEach(item => {
      if (!item.Product) return;
      const productId = item.Product.sku || item.Product.name;
      if (!acc[productId]) {
        acc[productId] = {
          name: item.Product.name,
          sku: item.Product.sku,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[productId].quantity += item.quantity;
      acc[productId].revenue += (order.totalAmount / order.OrderItem.length) || 0; // Distribute order value among items
    });
    return acc;
  }, {} as Record<string, any>);

  const topProducts = Object.values(productStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    summary: {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    },
    groupedData,
    topMerchants,
    topProducts,
    rawData: parameters.includeDetails ? orders : [],
  };
}

async function generateInventoryReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  // Get current stock levels
  const stockAllocations = await prisma.stockAllocation.findMany({
    include: {
      Product: {
        select: { id: true, name: true, sku: true },
      },
      Warehouse: {
        select: { id: true, name: true, region: true },
      },
    },
  });

  // Calculate inventory metrics
  const totalProducts = stockAllocations.length;
  const totalValue = stockAllocations.reduce((sum, allocation) => {
    return sum + (allocation.allocatedQuantity * 10); // Using average price estimate
  }, 0);

  const lowStockItems = stockAllocations.filter(allocation => 
    allocation.allocatedQuantity <= allocation.safetyStock
  );

  // Group by warehouse
  const warehouseStats = stockAllocations.reduce((acc, allocation) => {
    const warehouseId = allocation.Warehouse.id;
    if (!acc[warehouseId]) {
      acc[warehouseId] = {
        id: warehouseId,
        name: allocation.Warehouse.name,
        region: allocation.Warehouse.region,
        products: 0,
        totalValue: 0,
        lowStockCount: 0,
      };
    }
    acc[warehouseId].products += 1;
    acc[warehouseId].totalValue += allocation.allocatedQuantity * 10; // Using average price estimate
    if (allocation.allocatedQuantity <= allocation.safetyStock) {
      acc[warehouseId].lowStockCount += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  return {
    summary: {
      totalProducts,
      totalValue,
      lowStockCount: lowStockItems.length,
      warehouseCount: Object.keys(warehouseStats).length,
    },
    warehouseStats: Object.values(warehouseStats),
    lowStockItems,
    rawData: parameters.includeDetails ? stockAllocations : [],
  };
}

async function generateMerchantReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  const businesses = await prisma.business.findMany({
    include: {
      User_User_businessIdToBusiness: {
        where: { role: 'MERCHANT' },
        select: { id: true, firstName: true, lastName: true, email: true, lastLoginAt: true },
      },
      Order: {
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { id: true, totalAmount: true, status: true, orderDate: true },
      },
    },
  });

  const totalMerchants = businesses.length;
  const activeMerchants = businesses.filter(b => b.isActive).length;
  const totalOrders = businesses.reduce((sum, b) => sum + b.Order.length, 0);
  const totalRevenue = businesses.reduce((sum, b) => 
    sum + b.Order.reduce((orderSum, order) => orderSum + (order.totalAmount || 0), 0), 0
  );

  const merchantStats = businesses.map(business => ({
    id: business.id,
    name: business.name,
    status: business.isActive ? 'Active' : 'Inactive',
    onboardingStatus: business.onboardingStatus,
    orders: business.Order.length,
    revenue: business.Order.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    lastActivity: business.User_User_businessIdToBusiness[0]?.lastLoginAt || business.updatedAt,
  }));

  return {
    summary: {
      totalMerchants,
      activeMerchants,
      inactiveMerchants: totalMerchants - activeMerchants,
      totalOrders,
      totalRevenue,
    },
    merchantStats,
    rawData: parameters.includeDetails ? businesses : [],
  };
}

async function generateLogisticsReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  const shipments = await prisma.shipment.findMany({
    where: {
      lastStatusUpdate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      Order: {
        select: { id: true, Business: { select: { name: true } } },
      },
    },
  });

  const totalShipments = shipments.length;
  const deliveredShipments = shipments.filter(s => s.trackingNumber !== null).length;
  const deliveryRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;

  // Average delivery time not available with current schema
  const averageDeliveryTime = 0;

  const statusDistribution = shipments.reduce((acc, shipment) => {
    const status = shipment.trackingNumber ? 'TRACKED' : 'PENDING';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    summary: {
      totalShipments,
      deliveredShipments,
      deliveryRate,
      averageDeliveryTime,
    },
    statusDistribution,
    rawData: parameters.includeDetails ? shipments : [],
  };
}

async function generateFinancialReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      Business: {
        select: { name: true, baseCurrency: true },
      },
    },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      issueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + (invoice.totalDue || 0), 0);
  const totalOrders = orders.length;

  // Group revenue by period
  const revenueByPeriod = groupDataByPeriod(orders, parameters.groupBy, startDate, endDate);

  return {
    summary: {
      totalRevenue,
      totalInvoiced,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
    revenueByPeriod,
    rawData: parameters.includeDetails ? { orders, invoices } : {},
  };
}

async function generateComprehensiveReportData(startDate: Date, endDate: Date, parameters: ReportParameters) {
  // Combine data from all report types
  const [salesData, inventoryData, merchantData, logisticsData, financialData] = await Promise.all([
    generateSalesReportData(startDate, endDate, parameters),
    generateInventoryReportData(startDate, endDate, parameters),
    generateMerchantReportData(startDate, endDate, parameters),
    generateLogisticsReportData(startDate, endDate, parameters),
    generateFinancialReportData(startDate, endDate, parameters),
  ]);

  return {
    sales: salesData,
    inventory: inventoryData,
    merchants: merchantData,
    logistics: logisticsData,
    financial: financialData,
    summary: {
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      generatedAt: new Date().toISOString(),
    },
  };
}

function groupDataByPeriod(data: any[], groupBy: string, startDate: Date, endDate: Date) {
  // Implementation for grouping data by different periods
  const grouped: Record<string, any> = {};
  
  data.forEach(item => {
    const date = new Date(item.orderDate || item.createdAt);
    let key: string;
    
    switch (groupBy) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = { period: key, count: 0, revenue: 0, items: [] };
    }
    
    grouped[key].count += 1;
    grouped[key].revenue += item.totalAmount || 0;
    grouped[key].items.push(item);
  });
  
  return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
}

async function generateReportFile(reportType: string, data: any, parameters: ReportParameters) {
  const fileName = `${reportType.toLowerCase()}_report_${parameters.startDate}_${parameters.endDate}.${parameters.format.toLowerCase()}`;
  
  if (parameters.format === 'PDF') {
    return generatePDFReport(reportType, data, parameters, fileName);
  } else if (parameters.format === 'Excel') {
    return generateExcelReport(reportType, data, parameters, fileName);
  } else if (parameters.format === 'CSV') {
    return generateCSVReport(reportType, data, parameters, fileName);
  }
  
  throw new Error(`Unsupported format: ${parameters.format}`);
}

async function generatePDFReport(reportType: string, data: any, parameters: ReportParameters, fileName: string) {
  // Create PDF document
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
  });
  
  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // Add header
  doc.fontSize(20)
     .fillColor('#D4AF37')
     .text('SJFulfillment', 50, 50);
     
  doc.fontSize(16)
     .fillColor('#000000')
     .text(`${getReportTypeName(reportType)} Report`, 50, 80);
     
  doc.fontSize(12)
     .text(`Period: ${parameters.startDate} to ${parameters.endDate}`, 50, 110)
     .text(`Generated: ${new Date().toLocaleString()}`, 50, 130);
     
  // Add summary section
  let yPosition = 170;
  doc.fontSize(14).text('Summary', 50, yPosition);
  yPosition += 30;
  
  if (data.summary) {
    Object.entries(data.summary).forEach(([key, value]) => {
      if (typeof value === 'object') return;
      doc.fontSize(10)
         .text(`${key}: ${typeof value === 'number' ? value.toLocaleString() : value}`, 70, yPosition);
      yPosition += 20;
    });
  }
  
  // Add charts section if requested
  if (parameters.includeCharts && data.groupedData) {
    yPosition += 30;
    doc.fontSize(14).text('Performance Over Time', 50, yPosition);
    yPosition += 30;
    
    // Simple table representation of grouped data
    data.groupedData.forEach((item: any) => {
      doc.fontSize(10)
         .text(`${item.period}: ${item.count} orders, $${item.revenue.toLocaleString()}`, 70, yPosition);
      yPosition += 15;
    });
  }
  
  // Add detailed data if requested
  if (parameters.includeDetails && data.rawData && data.rawData.length > 0) {
    doc.addPage();
    yPosition = 50;
    doc.fontSize(14).text('Detailed Data', 50, yPosition);
    yPosition += 30;
    
    // Add detailed table (simplified version)
    const items = Array.isArray(data.rawData) ? data.rawData.slice(0, 20) : []; // Limit to first 20 items
    items.forEach((item: any) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(10)
         .text(`ID: ${item.id || 'N/A'}`, 50, yPosition)
         .text(`Amount: $${(item.totalAmount || 0).toLocaleString()}`, 200, yPosition)
         .text(`Date: ${new Date(item.orderDate || item.createdAt || '').toLocaleDateString()}`, 350, yPosition);
      yPosition += 20;
    });
  }
  
  doc.end();
  
  return new Promise<{ fileBuffer: Buffer; fileName: string }>((resolve) => {
    doc.on('end', () => {
      const fileBuffer = Buffer.concat(buffers);
      resolve({ fileBuffer, fileName });
    });
  });
}

async function generateExcelReport(reportType: string, data: any, parameters: ReportParameters, fileName: string) {
  // For now, return a simple text representation
  // In a real implementation, you'd use a library like xlsx or exceljs
  const content = JSON.stringify(data, null, 2);
  const fileBuffer = Buffer.from(content, 'utf-8');
  return { fileBuffer, fileName };
}

async function generateCSVReport(reportType: string, data: any, parameters: ReportParameters, fileName: string) {
  // Simple CSV generation
  let csvContent = '';
  
  if (data.rawData && Array.isArray(data.rawData)) {
    const headers = Object.keys(data.rawData[0] || {});
    csvContent = headers.join(',') + '\n';
    
    data.rawData.forEach((row: any) => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value || '';
      });
      csvContent += values.join(',') + '\n';
    });
  }
  
  const fileBuffer = Buffer.from(csvContent, 'utf-8');
  return { fileBuffer, fileName };
}

function getReportTypeName(reportType: string): string {
  const names = {
    SALES: 'Sales Performance',
    INVENTORY: 'Inventory Status',
    MERCHANT: 'Merchant Activity',
    LOGISTICS: 'Logistics Performance',
    FINANCIAL: 'Financial Summary',
    COMPREHENSIVE: 'Comprehensive Business',
  };
  return names[reportType as keyof typeof names] || reportType;
}