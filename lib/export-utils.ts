/**
 * Export utilities for converting data to various formats (CSV, Excel)
 * Provides functions to export orders, products, customers, and other data
 */

export interface ExportConfig {
  filename: string;
  headers: string[];
  data: any[];
  formatters?: { [key: string]: (value: any) => string };
}

/**
 * Convert array of objects to CSV format
 */
export function arrayToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Handle objects/arrays
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });

  return csvHeaders + '\n' + csvRows.join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadCSV(config: ExportConfig): void {
  const { filename, headers, data, formatters } = config;
  
  // Apply formatters if provided
  const processedData = data.map(row => {
    const newRow = { ...row };
    if (formatters) {
      Object.keys(formatters).forEach(key => {
        if (newRow[key] !== undefined) {
          newRow[key] = formatters[key](newRow[key]);
        }
      });
    }
    return newRow;
  });

  const csv = arrayToCSV(processedData, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export orders data
 */
export function exportOrders(orders: any[]): void {
  const headers = [
    'orderNumber',
    'customerName', 
    'customerEmail',
    'status',
    'paymentStatus',
    'fulfillmentStatus',
    'totalAmount',
    'currency',
    'itemsCount',
    'createdAt',
    'merchantName'
  ];

  const formatters = {
    createdAt: (date: string) => new Date(date).toLocaleDateString(),
    totalAmount: (amount: number) => amount?.toFixed(2) || '0.00',
    customerName: (customer: any) => customer ? `${customer.firstName} ${customer.lastName}`.trim() : '',
    customerEmail: (customer: any) => customer?.email || '',
    currency: (currency: any) => currency?.code || '',
    itemsCount: (count: any) => count?.items || '0',
    merchantName: (merchant: any) => merchant?.businessName || ''
  };

  downloadCSV({
    filename: `orders-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: orders,
    formatters
  });
}

/**
 * Export products data
 */
export function exportProducts(products: any[]): void {
  const headers = [
    'name',
    'sku',
    'category',
    'price',
    'currency',
    'stockQuantity',
    'lowStockThreshold',
    'status',
    'merchantName',
    'createdAt'
  ];

  const formatters = {
    createdAt: (date: string) => new Date(date).toLocaleDateString(),
    price: (amount: number) => amount?.toFixed(2) || '0.00',
    category: (category: any) => category?.name || '',
    currency: (currency: any) => currency?.code || '',
    merchantName: (merchant: any) => merchant?.businessName || ''
  };

  downloadCSV({
    filename: `products-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: products,
    formatters
  });
}

/**
 * Export customers data
 */
export function exportCustomers(customers: any[]): void {
  const headers = [
    'firstName',
    'lastName', 
    'email',
    'phone',
    'orderCount',
    'totalSpent',
    'currency',
    'status',
    'createdAt',
    'lastOrderDate'
  ];

  const formatters = {
    createdAt: (date: string) => new Date(date).toLocaleDateString(),
    lastOrderDate: (date: string) => date ? new Date(date).toLocaleDateString() : '',
    totalSpent: (amount: number) => amount?.toFixed(2) || '0.00',
    currency: (currency: any) => currency?.code || ''
  };

  downloadCSV({
    filename: `customers-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: customers,
    formatters
  });
}

/**
 * Export shipments data
 */
export function exportShipments(shipments: any[]): void {
  const headers = [
    'trackingNumber',
    'orderNumber',
    'customerName',
    'status',
    'carrierName',
    'shippingMethod',
    'origin',
    'destination',
    'shippedAt',
    'estimatedDelivery',
    'actualDelivery'
  ];

  const formatters = {
    shippedAt: (date: string) => date ? new Date(date).toLocaleDateString() : '',
    estimatedDelivery: (date: string) => date ? new Date(date).toLocaleDateString() : '',
    actualDelivery: (date: string) => date ? new Date(date).toLocaleDateString() : '',
    customerName: (order: any) => {
      if (order?.customer) {
        return `${order.customer.firstName} ${order.customer.lastName}`.trim();
      }
      return '';
    },
    orderNumber: (order: any) => order?.orderNumber || ''
  };

  downloadCSV({
    filename: `shipments-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: shipments,
    formatters
  });
}

/**
 * Export analytics/dashboard data
 */
export function exportAnalytics(data: any): void {
  // Convert dashboard stats to exportable format
  const analyticsData = [];
  
  if (data.stats) {
    // Orders analytics
    analyticsData.push({
      metric: 'Total Orders',
      value: data.stats.orders?.total || 0,
      category: 'Orders'
    });
    analyticsData.push({
      metric: 'Pending Orders',
      value: data.stats.orders?.pending || 0,
      category: 'Orders'
    });
    analyticsData.push({
      metric: 'Processing Orders',
      value: data.stats.orders?.processing || 0,
      category: 'Orders'
    });
    analyticsData.push({
      metric: 'Delivered Orders',
      value: data.stats.orders?.delivered || 0,
      category: 'Orders'
    });
    
    // Revenue analytics
    analyticsData.push({
      metric: 'Total Revenue',
      value: data.stats.revenue?.totalRaw || 0,
      category: 'Revenue'
    });
    analyticsData.push({
      metric: 'Monthly Revenue',
      value: data.stats.revenue?.monthRaw || 0,
      category: 'Revenue'
    });
    analyticsData.push({
      metric: 'Pending Revenue',
      value: data.stats.revenue?.pendingRaw || 0,
      category: 'Revenue'
    });
    
    // Product analytics
    analyticsData.push({
      metric: 'Total Products',
      value: data.stats.products?.total || 0,
      category: 'Products'
    });
    analyticsData.push({
      metric: 'Low Stock Products',
      value: data.stats.products?.lowStock || 0,
      category: 'Products'
    });
    
    // Customer analytics
    analyticsData.push({
      metric: 'Total Customers',
      value: data.stats.customers?.total || 0,
      category: 'Customers'
    });
    analyticsData.push({
      metric: 'New Customers This Month',
      value: data.stats.customers?.newMonth || 0,
      category: 'Customers'
    });
  }

  const headers = ['metric', 'value', 'category'];
  
  downloadCSV({
    filename: `analytics-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: analyticsData
  });
}

/**
 * Export financial reports
 */
export function exportFinancialReport(data: any): void {
  const reportData = [];
  
  // Add revenue breakdown
  if (data.revenue) {
    reportData.push({
      type: 'Revenue',
      period: 'Total',
      amount: data.revenue.totalRaw || 0,
      currency: data.revenue.currency?.code || '',
      description: 'Total revenue across all periods'
    });
    reportData.push({
      type: 'Revenue',
      period: 'This Month',
      amount: data.revenue.monthRaw || 0,
      currency: data.revenue.currency?.code || '',
      description: 'Revenue for current month'
    });
    reportData.push({
      type: 'Revenue',
      period: 'This Week',
      amount: data.revenue.weekRaw || 0,
      currency: data.revenue.currency?.code || '',
      description: 'Revenue for current week'
    });
    reportData.push({
      type: 'Revenue',
      period: 'Today',
      amount: data.revenue.todayRaw || 0,
      currency: data.revenue.currency?.code || '',
      description: 'Revenue for today'
    });
    reportData.push({
      type: 'Revenue',
      period: 'Pending',
      amount: data.revenue.pendingRaw || 0,
      currency: data.revenue.currency?.code || '',
      description: 'Pending revenue from unpaid orders'
    });
  }

  const headers = ['type', 'period', 'amount', 'currency', 'description'];
  
  const formatters = {
    amount: (amount: number) => amount?.toFixed(2) || '0.00'
  };

  downloadCSV({
    filename: `financial-report-${new Date().toISOString().split('T')[0]}`,
    headers,
    data: reportData,
    formatters
  });
}