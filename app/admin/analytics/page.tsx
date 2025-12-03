"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  Building,
  Eye,
  Target,
  Activity,
  Star,
  Shield,
  CheckCircle,
  AlertTriangle,
  Truck,
  Zap,
  Globe,
  CreditCard,
  PieChart,
  LineChart,
} from "lucide-react";
import { get } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    orderGrowth: number;
    revenueGrowth: number;
    period: number;
  };
  charts: {
    dailyTrends: Array<{
      date: string;
      orders: number;
      revenue: number;
      avg_order_value: number;
    }>;
    statusDistribution: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    revenueByBusiness: Array<{
      merchantId: string;
      businessName: string;
      currency: string;
      _sum: { totalAmount: number };
      _count: { id: number };
    }>;
  };
  rankings: {
    topProducts: Array<{
      productId: string;
      productName: string;
      productSku: string;
      businessName: string;
      _sum: { quantity: number };
      _count: { id: number };
    }>;
    warehousePerformance: Array<{
      id: string;
      name: string;
      region: string;
    }>;
  };
  alerts: {
    lowStockAllocations: Array<{
      id: string;
      stockLevel: number;
      productId: string;
      productName: string;
      productSku: string;
      businessName: string;
      warehouseName: string;
    }>;
    totalCustomers: number;
  };
  metadata: {
    generatedAt: string;
    period: string;
    userRole: string;
    filters: {
      businessId: string | null;
      warehouseId: string | null;
    };
  };
}

interface TopPerformers {
  businesses: Array<{
    id: string;
    name: string;
    totalRevenue: number;
    orderCount: number;
  }>;
  products: Array<{
    id: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  customers: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformers | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      params.append("timeRange", timeRange);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const data = (await get(`/api/admin/analytics?${params}`)) as any;

      if (data?.success && data?.analytics) {
        setAnalytics(data.analytics);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalytics(null);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      const data = (await get("/api/admin/analytics/top-performers")) as any;
      if (data?.success) {
        setTopPerformers(data.topPerformers);
      } else {
        setTopPerformers(null);
      }
    } catch (error) {
      console.error("Failed to fetch top performers:", error);
      setTopPerformers(null);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAnalytics(), fetchTopPerformers()]);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [timeRange, dateRange]);

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    const icon = isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
    const colorClass = isPositive ? "text-emerald-400" : "text-red-400";

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {icon}
        <span className="text-sm font-medium">
          {isPositive ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-black p-6 min-h-screen">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-300 text-lg">
                Loading analytics data from backend...
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[#232323] border border-gray-700 rounded-lg p-6 animate-pulse"
              >
                <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
                <div className="h-10 w-24 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-16 bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-black p-6 min-h-screen">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-300 text-lg">
                Unable to load analytics data
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-gray-700 rounded-lg">
            <BarChart3 className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Analytics Data Available
            </h3>
            <p className="text-gray-400 text-center max-w-md">
              Unable to retrieve analytics data from the backend. Please ensure
              there is data in the system or try refreshing the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-300 text-lg">
              Comprehensive platform metrics and business intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1.5">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Live Data
            </Badge>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              />
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-10 px-3 border border-gray-600 rounded-md bg-[#2a2a2a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Revenue & Order Metrics */}
        {analytics && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Total Revenue
                </CardTitle>
                <div className="p-3 bg-[#f8c017]/20 rounded-xl"></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analytics?.summary?.totalRevenue
                    ? formatCurrency(analytics.summary.totalRevenue, "USD")
                    : "$0"}
                </div>
                <div className="flex items-center justify-between">
                  {analytics?.summary?.revenueGrowth !== undefined ? (
                    formatChange(analytics.summary.revenueGrowth)
                  ) : (
                    <span className="text-gray-400">No data</span>
                  )}
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Growth:{" "}
                  <span className="text-emerald-400 font-medium">
                    +{analytics?.summary?.revenueGrowth || 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Total Orders
                </CardTitle>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analytics?.summary?.totalOrders?.toLocaleString() || "0"}
                </div>
                <div className="flex items-center justify-between">
                  {analytics?.summary?.orderGrowth !== undefined ? (
                    formatChange(analytics.summary.orderGrowth)
                  ) : (
                    <span className="text-gray-400">No data</span>
                  )}
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Daily Avg:{" "}
                  <span className="text-blue-400 font-medium">
                    {analytics?.summary?.averageOrderValue || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Active Users
                </CardTitle>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analytics?.alerts?.totalCustomers?.toLocaleString() || "0"}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Customer Base</span>
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Engagement:{" "}
                  <span className="text-emerald-400 font-medium">N/A</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Merchants */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-purple-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Active Merchants
                </CardTitle>
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Building className="h-5 w-5 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {analytics?.charts?.revenueByBusiness?.length || 0}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Active Businesses
                  </span>
                  <span className="text-xs text-gray-500">vs last period</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Verified:{" "}
                  <span className="text-purple-400 font-medium">
                    {analytics?.charts?.revenueByBusiness?.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Secondary Metrics Row - Only show metrics with real data */}
        {analytics && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Avg Order Value */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-cyan-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Avg Order Value
                </CardTitle>
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-2">
                  {analytics?.summary?.averageOrderValue
                    ? formatCurrency(analytics.summary.averageOrderValue, "USD")
                    : "$0"}
                </div>
                {/* Growth indicator can be calculated from orderGrowth */}
                <span className="text-xs text-gray-400">Order Value Trend</span>
              </CardContent>
            </Card>

            {/* Total Products */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-green-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Total Products
                </CardTitle>
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Package className="h-5 w-5 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-2">
                  {analytics?.rankings?.topProducts?.length?.toLocaleString() ||
                    "0"}
                </div>
                <p className="text-xs text-green-400">Across all merchants</p>
              </CardContent>
            </Card>

            {/* Total Warehouses */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Warehouses
                </CardTitle>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Building className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-2">
                  {analytics?.rankings?.warehousePerformance?.length || 0}
                </div>
                <p className="text-xs text-blue-400">Storage facilities</p>
              </CardContent>
            </Card>

            {/* Processing Orders */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-orange-500/50 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Processing
                </CardTitle>
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Truck className="h-5 w-5 text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-2">
                  {analytics?.charts?.statusDistribution?.find(
                    (s) => s.status === "PROCESSING"
                  )?.count || 0}
                </div>
                <p className="text-xs text-orange-400">Orders in progress</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real Analytics Sections */}
        {analytics && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Order Status Breakdown */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#f8c017]" />
                  Order Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Order status breakdown from real data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-white font-medium">Completed</span>
                  </div>
                  <span className="text-emerald-400 font-bold">
                    {analytics?.charts?.statusDistribution
                      ?.find((s) => s.status === "COMPLETED")
                      ?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-white font-medium">Processing</span>
                  </div>
                  <span className="text-blue-400 font-bold">
                    {analytics?.charts?.statusDistribution
                      ?.find((s) => s.status === "PROCESSING")
                      ?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#f8c017] rounded-full"></div>
                    <span className="text-white font-medium">Pending</span>
                  </div>
                  <span className="text-[#f8c017] font-bold">
                    {analytics?.charts?.statusDistribution
                      ?.find((s) => s.status === "PENDING")
                      ?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-white font-medium">Cancelled</span>
                  </div>
                  <span className="text-red-400 font-bold">
                    {analytics?.charts?.statusDistribution
                      ?.find((s) => s.status === "CANCELLED")
                      ?.count?.toLocaleString() || "0"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* User Analytics */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#f8c017]" />
                  User Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Customer and user metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">Total Users</p>
                    <p className="text-xs text-gray-400">All platform users</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-xl">
                    {analytics?.alerts?.totalCustomers?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">Active Users</p>
                    <p className="text-xs text-gray-400">Currently engaged</p>
                  </div>
                  <span className="text-blue-400 font-bold text-xl">
                    {analytics?.alerts?.totalCustomers?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">New Users</p>
                    <p className="text-xs text-gray-400">This period</p>
                  </div>
                  <span className="text-[#f8c017] font-bold text-xl">
                    {"0"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Merchant Analytics */}
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#f8c017]" />
                  Merchant Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Business and merchant metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">Total Merchants</p>
                    <p className="text-xs text-gray-400">Active businesses</p>
                  </div>
                  <span className="text-[#f8c017] font-bold text-xl">
                    {analytics?.charts?.revenueByBusiness?.length?.toLocaleString() ||
                      "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">Verified</p>
                    <p className="text-xs text-gray-400">Approved merchants</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-xl">
                    {analytics?.charts?.revenueByBusiness?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                  <div>
                    <p className="text-white font-medium">Daily Avg Orders</p>
                    <p className="text-xs text-gray-400">Per day average</p>
                  </div>
                  <span className="text-blue-400 font-bold text-xl">
                    {Math.round(
                      analytics?.summary?.totalOrders /
                        analytics?.summary?.period || 0
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Performers Section */}
        {topPerformers && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Top Businesses */}
            {topPerformers.businesses.length > 0 && (
              <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Building className="h-5 w-5 text-[#f8c017]" />
                    Top Businesses
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Highest revenue generating businesses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers.businesses
                    .slice(0, 5)
                    .map((business, index) => (
                      <div
                        key={business.id}
                        className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{
                              backgroundColor: [
                                "#f8c017",
                                "#3b82f6",
                                "#10b981",
                                "#f59e0b",
                                "#8b5cf6",
                              ][index % 5],
                            }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {business.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {business.orderCount} orders
                            </p>
                          </div>
                        </div>
                        <span className="text-[#f8c017] font-bold">
                          {formatCurrency(business.totalRevenue, "USD")}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Top Products */}
            {topPerformers.products.length > 0 && (
              <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#f8c017]" />
                    Top Products
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Best selling products by quantity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers.products.slice(0, 5).map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{
                            backgroundColor: [
                              "#f8c017",
                              "#3b82f6",
                              "#10b981",
                              "#f59e0b",
                              "#8b5cf6",
                            ][index % 5],
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {product.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {product.totalSold} sold
                          </p>
                        </div>
                      </div>
                      <span className="text-[#f8c017] font-bold">
                        {formatCurrency(product.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Top Customers */}
            {topPerformers.customers.length > 0 && (
              <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#f8c017]" />
                    Top Customers
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Highest value customers by total spend
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers.customers
                    .slice(0, 5)
                    .map((customer, index) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{
                              backgroundColor: [
                                "#f8c017",
                                "#3b82f6",
                                "#10b981",
                                "#f59e0b",
                                "#8b5cf6",
                              ][index % 5],
                            }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {customer.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {customer.orderCount} orders
                            </p>
                          </div>
                        </div>
                        <span className="text-[#f8c017] font-bold">
                          {formatCurrency(customer.totalSpent, "USD")}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
