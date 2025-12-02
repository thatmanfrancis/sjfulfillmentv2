"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BarChart3,
  TrendingUp,
  Download,
  Package,
  ShoppingCart,
} from "lucide-react";

interface MerchantAnalytics {
  sales: {
    current: number;
    previous: number;
    change: number;
  };
  orders: {
    current: number;
    previous: number;
    change: number;
  };
  products: {
    current: number;
    previous: number;
    change: number;
  };
  conversion: {
    current: number;
    previous: number;
    change: number;
  };
  currency: string;
  charts?: {
    sales: Array<{ date: string; value: number }>;
    orders: Array<{ date: string; count: number }>;
    topProducts: Array<{ name: string; count: number }>;
    customerGrowth: Array<{ date: string; count: number }>;
  };
}

export default function MerchantAnalyticsPage() {
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/merchant/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (error: any) {
      setError(error.message || "Failed to fetch analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number) => {
    const isPositive = change > 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const icon = isPositive ? "↗" : "↘";
    return (
      <span className={`text-sm ${color} flex items-center gap-1`}>
        {icon} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 bg-black">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              Error Loading Analytics
            </CardTitle>
            <CardDescription className="text-red-300">
              {error}. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={fetchAnalytics}
              variant="outline"
              className="text-red-400 border-red-400"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 min-h-screen space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Merchant Analytics
          </h1>
          <p className="text-gray-300 text-lg">
            Complete business overview and key performance indicators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1.5">
            Live
          </Badge>
          <Badge className="bg-[#f8c017]/20 text-[#f8c017] border-[#f8c017]/30 px-3 py-1.5">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {analytics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Sales */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Sales
              </CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <BarChart3 className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: analytics.currency,
                }).format(analytics.sales.current)}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                {formatChange(analytics.sales.change)}
                <span className="ml-2">from last period</span>
              </p>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Orders
              </CardTitle>
              <div className="p-3 bg-gray-600/50 rounded-xl">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.orders.current.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                {formatChange(analytics.orders.change)}
                <span className="ml-2">from last period</span>
              </p>
            </CardContent>
          </Card>

          {/* Active Products */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Active Products
              </CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Package className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.products.current.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                {formatChange(analytics.products.change)}
                <span className="ml-2">from last period</span>
              </p>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Conversion Rate
              </CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.conversion.current}%
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                {formatChange(analytics.conversion.change)}
                <span className="ml-2">from last period</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>
              Daily sales over the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              {analytics?.charts?.sales?.length ? (
                <svg width="100%" height="100%" viewBox="0 0 400 200">
                  <polyline
                    fill="none"
                    stroke="#f8c017"
                    strokeWidth="3"
                    points={(analytics.charts?.sales ?? [])
                      .map(
                        (d, i, arr) =>
                          `${i * (400 / (arr.length || 1))},${
                            200 -
                            (d.value * 200) /
                              Math.max(...arr.map((x) => x.value), 1)
                          }`
                      )
                      .join(" ")}
                  />
                </svg>
              ) : (
                <p className="text-muted-foreground">No sales data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Order Volume</CardTitle>
            <CardDescription>Number of orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              {analytics?.charts?.orders?.length ? (
                <svg width="100%" height="100%" viewBox="0 0 400 200">
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3"
                    points={(analytics.charts?.orders ?? [])
                      .map(
                        (d, i, arr) =>
                          `${i * (400 / (arr.length || 1))},${
                            200 -
                            (d.count * 200) /
                              Math.max(...arr.map((x) => x.count), 1)
                          }`
                      )
                      .join(" ")}
                  />
                </svg>
              ) : (
                <p className="text-muted-foreground">No order data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              {analytics?.charts?.topProducts?.length ? (
                <svg width="100%" height="100%" viewBox="0 0 400 200">
                  {analytics.charts.topProducts.map((d, i) => (
                    <rect
                      key={d.name}
                      x={i * 70 + 30}
                      y={
                        200 -
                        (d.count * 180) /
                          Math.max(
                            ...(analytics.charts?.topProducts ?? []).map(
                              (x) => x.count
                            ),
                            1
                          )
                      }
                      width="40"
                      height={
                        (d.count * 180) /
                        Math.max(
                          ...(analytics.charts?.topProducts ?? []).map(
                            (x) => x.count
                          ),
                          1
                        )
                      }
                      fill="#f8c017"
                    />
                  ))}
                  {analytics.charts.topProducts.map((d, i) => (
                    <text
                      key={d.name + "-label"}
                      x={i * 70 + 50}
                      y={190}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                    >
                      {d.name}
                    </text>
                  ))}
                </svg>
              ) : (
                <p className="text-muted-foreground">No product data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>New customer acquisitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              {analytics?.charts?.customerGrowth?.length ? (
                <svg width="100%" height="100%" viewBox="0 0 400 200">
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    points={(analytics.charts?.customerGrowth ?? [])
                      .map(
                        (d, i, arr) =>
                          `${i * (400 / (arr.length || 1))},${
                            200 -
                            (d.count * 200) /
                              Math.max(...arr.map((x) => x.count), 1)
                          }`
                      )
                      .join(" ")}
                  />
                </svg>
              ) : (
                <p className="text-muted-foreground">No customer data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
