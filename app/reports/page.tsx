"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface ReportData {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowth: number;
    ordersGrowth: number;
  };
  products: {
    totalProducts: number;
    topSellingProducts: Array<{
      id: string;
      name: string;
      sku: string;
      totalSold: number;
      revenue: number;
    }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      sku: string;
      stockLevel: number;
      minStockLevel: number;
    }>;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
    topCustomers: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      totalOrders: number;
      totalSpent: number;
    }>;
  };
  returns: {
    totalReturns: number;
    returnRate: number;
    totalRefunded: number;
    commonReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("overview");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        days: dateRange,
        type: reportType,
      });

      const response = await api.get(`/api/reports?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch reports");
      }

      const data: ReportData = response.data;
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange, reportType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8 text-gray-400">
        No report data available
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Reports</h1>
          <p className="text-gray-400 mt-1">Analytics and insights for your business</p>
        </div>
        
        <div className="flex gap-2 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
          >
            <option value="overview">Overview</option>
            <option value="sales">Sales</option>
            <option value="products">Products</option>
            <option value="customers">Customers</option>
            <option value="returns">Returns</option>
          </select>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(reportData.sales.totalRevenue)}
              </p>
              <p className={`text-sm ${reportData.sales.revenueGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatPercentage(reportData.sales.revenueGrowth)} from last period
              </p>
            </div>
            <div className="bg-green-900 p-3 rounded-full">
              <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">
                {reportData.sales.totalOrders.toLocaleString()}
              </p>
              <p className={`text-sm ${reportData.sales.ordersGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatPercentage(reportData.sales.ordersGrowth)} from last period
              </p>
            </div>
            <div className="bg-blue-900 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Order Value</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(reportData.sales.averageOrderValue)}
              </p>
              <p className="text-sm text-gray-400">Per order</p>
            </div>
            <div className="bg-purple-900 p-3 rounded-full">
              <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Return Rate</p>
              <p className="text-2xl font-bold text-white">
                {reportData.returns.returnRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">
                {reportData.returns.totalReturns} returns
              </p>
            </div>
            <div className="bg-orange-900 p-3 rounded-full">
              <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {reportData.products.topSellingProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-gray-400 text-sm">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{product.totalSold} sold</p>
                  <p className="text-gray-400 text-sm">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Top Customers</h3>
          <div className="space-y-3">
            {reportData.customers.topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-gray-400 text-sm">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{customer.totalOrders} orders</p>
                  <p className="text-gray-400 text-sm">{formatCurrency(customer.totalSpent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Low Stock Alert</h3>
          {reportData.products.lowStockProducts.length === 0 ? (
            <p className="text-gray-400">No low stock items</p>
          ) : (
            <div className="space-y-3">
              {reportData.products.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-gray-400 text-sm">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-medium">{product.stockLevel} left</p>
                    <p className="text-gray-400 text-sm">Min: {product.minStockLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Return Reasons */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Return Reasons</h3>
          <div className="space-y-3">
            {reportData.returns.commonReasons.map((reason, index) => (
              <div key={reason.reason} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-white">{reason.reason.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{reason.count} returns</p>
                  <p className="text-gray-400 text-sm">{reason.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Total Products</div>
          <div className="text-2xl font-bold text-white">{reportData.products.totalProducts}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Total Customers</div>
          <div className="text-2xl font-bold text-white">{reportData.customers.totalCustomers}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">New Customers</div>
          <div className="text-2xl font-bold text-white">{reportData.customers.newCustomers}</div>
        </div>
      </div>
    </div>
  );
}