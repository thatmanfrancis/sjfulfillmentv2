'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BarChart3, TrendingUp, Download, Package, ShoppingCart } from 'lucide-react';

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
}

export default function MerchantAnalyticsPage() {
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Mock data - replace with actual API call
      const mockAnalytics: MerchantAnalytics = {
        sales: {
          current: 45000,
          previous: 38000,
          change: 18.4
        },
        orders: {
          current: 234,
          previous: 198,
          change: 18.2
        },
        products: {
          current: 47,
          previous: 42,
          change: 11.9
        },
        conversion: {
          current: 4.2,
          previous: 3.8,
          change: 10.5
        }
      };
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number) => {
    const isPositive = change > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? '↗' : '↘';
    return (
      <span className={`text-sm ${color} flex items-center gap-1`}>
        {icon} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Track your business performance and growth metrics.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.sales.current.toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.sales.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.orders.current.toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.orders.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.products.current.toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.products.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.conversion.current}%</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.conversion.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Daily sales over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Sales chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Volume</CardTitle>
            <CardDescription>Number of orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Orders chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Products chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>New customer acquisitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Customer growth chart placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}