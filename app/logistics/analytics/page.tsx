'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BarChart3, TrendingUp, Download, Truck, Package, MapPin } from 'lucide-react';

interface LogisticsAnalytics {
  shipments: {
    current: number;
    previous: number;
    change: number;
  };
  onTimeDelivery: {
    current: number;
    previous: number;
    change: number;
  };
  avgDeliveryTime: {
    current: number;
    previous: number;
    change: number;
  };
  activeRoutes: {
    current: number;
    previous: number;
    change: number;
  };
}

export default function LogisticsAnalyticsPage() {
  const [analytics, setAnalytics] = useState<LogisticsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Mock data - replace with actual API call
      const mockAnalytics: LogisticsAnalytics = {
        shipments: {
          current: 1847,
          previous: 1632,
          change: 13.2
        },
        onTimeDelivery: {
          current: 94.8,
          previous: 92.1,
          change: 2.9
        },
        avgDeliveryTime: {
          current: 2.3,
          previous: 2.7,
          change: -14.8
        },
        activeRoutes: {
          current: 23,
          previous: 19,
          change: 21.1
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
            Monitor logistics performance and delivery metrics.
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
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.shipments.current.toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.shipments.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.onTimeDelivery.current}%</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.onTimeDelivery.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgDeliveryTime.current} days</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.avgDeliveryTime.change)}
                <span className="text-xs text-muted-foreground">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeRoutes.current.toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {formatChange(analytics.activeRoutes.change)}
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
            <CardTitle>Shipment Volume</CardTitle>
            <CardDescription>Daily shipments over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Shipment volume chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Performance</CardTitle>
            <CardDescription>On-time delivery trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Delivery performance chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Route Efficiency</CardTitle>
            <CardDescription>Average delivery times by route</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Route efficiency chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Distribution</CardTitle>
            <CardDescription>Shipment distribution by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Regional distribution chart placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}