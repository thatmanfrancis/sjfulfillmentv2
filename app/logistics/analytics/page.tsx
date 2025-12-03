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
  TrendingDown,
  Download,
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Navigation,
} from "lucide-react";
import { get } from "@/lib/api";

interface LogisticsAnalytics {
  shipments: {
    current: number;
    previous: number;
    change: number;
    delivered: number;
    inTransit: number;
    pending: number;
    cancelled: number;
    byStatus: {
      delivered: number;
      inTransit: number;
      pending: number;
      cancelled: number;
    };
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
    trend: string;
  };
  activeRoutes: {
    current: number;
    previous: number;
    change: number;
  };
  regionalDistribution: Array<{
    region: string;
    shipments: number;
  }>;
  recentShipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    business: string;
    customer: string;
    createdAt: string;
  }>;
  metadata: {
    period: string;
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
}

export default function LogisticsAnalyticsPage() {
  const [analytics, setAnalytics] = useState<LogisticsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("timeRange", timeRange);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const data = (await get(`/api/logistics/analytics?${params}`)) as any;

      if (data?.success && data?.analytics) {
        setAnalytics(data.analytics);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Failed to fetch logistics analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, dateRange]);

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
                Logistics Analytics
              </h1>
              <p className="text-gray-300 text-lg">
                Loading logistics data from backend...
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
                Logistics Analytics
              </h1>
              <p className="text-gray-300 text-lg">
                Unable to load logistics data
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-gray-700 rounded-lg">
            <Truck className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Logistics Data Available
            </h3>
            <p className="text-gray-400 text-center max-w-md">
              Unable to retrieve logistics data from the backend. Please ensure
              there are shipments in the system or try refreshing the page.
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
              Logistics Analytics
            </h1>
            <p className="text-gray-300 text-lg">
              Monitor logistics performance and delivery metrics
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

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Shipments */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Shipments
              </CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Package className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.shipments.current.toLocaleString()}
              </div>
              <div className="flex items-center justify-between">
                {formatChange(analytics.shipments.change)}
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Delivered:{" "}
                <span className="text-emerald-400 font-medium">
                  {analytics.shipments.delivered}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* On-Time Delivery */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                On-Time Delivery
              </CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.onTimeDelivery.current}%
              </div>
              <div className="flex items-center justify-between">
                {formatChange(analytics.onTimeDelivery.change)}
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Performance:{" "}
                <span className="text-emerald-400 font-medium">Excellent</span>
              </div>
            </CardContent>
          </Card>

          {/* Avg Delivery Time */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Avg Delivery Time
              </CardTitle>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.avgDeliveryTime.current} days
              </div>
              <div className="flex items-center justify-between">
                {formatChange(analytics.avgDeliveryTime.change)}
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Trend:{" "}
                <span className="text-blue-400 font-medium">
                  {analytics.avgDeliveryTime.trend}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Active Routes */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-purple-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Active Routes
              </CardTitle>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Navigation className="h-5 w-5 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {analytics.activeRoutes.current}
              </div>
              <div className="flex items-center justify-between">
                {formatChange(analytics.activeRoutes.change)}
                <span className="text-xs text-gray-500">vs last period</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Coverage:{" "}
                <span className="text-purple-400 font-medium">Regional</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Shipment Status Breakdown */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#f8c017]" />
                Shipment Status
              </CardTitle>
              <CardDescription className="text-gray-400">
                Breakdown by shipment status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-white font-medium">Delivered</span>
                </div>
                <span className="text-emerald-400 font-bold">
                  {analytics.shipments.byStatus.delivered}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-white font-medium">In Transit</span>
                </div>
                <span className="text-blue-400 font-bold">
                  {analytics.shipments.byStatus.inTransit}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-[#f8c017] rounded-full"></div>
                  <span className="text-white font-medium">Pending</span>
                </div>
                <span className="text-[#f8c017] font-bold">
                  {analytics.shipments.byStatus.pending}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1f1f1f] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-white font-medium">Cancelled</span>
                </div>
                <span className="text-red-400 font-bold">
                  {analytics.shipments.byStatus.cancelled}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Regional Distribution */}
          {analytics.regionalDistribution.length > 0 && (
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#f8c017]" />
                  Regional Distribution
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Shipments by region
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.regionalDistribution
                  .slice(0, 5)
                  .map((region, index) => (
                    <div
                      key={region.region}
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
                        <span className="text-white font-medium">
                          {region.region}
                        </span>
                      </div>
                      <span className="text-[#f8c017] font-bold">
                        {region.shipments}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Shipments */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#f8c017]" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-gray-400">
                Latest shipment activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.recentShipments.slice(0, 5).map((shipment, index) => (
                <div
                  key={shipment.id}
                  className="p-3 bg-[#1f1f1f] rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">
                      {shipment.trackingNumber}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        shipment.status === "DELIVERED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : ["PICKED_UP", "DELIVERING"].includes(
                              shipment.status
                            )
                          ? "bg-blue-500/20 text-blue-400"
                          : [
                              "NEW",
                              "AWAITING_ALLOC",
                              "ASSIGNED_TO_LOGISTICS",
                              "GOING_TO_PICKUP",
                            ].includes(shipment.status)
                          ? "bg-yellow-500/20 text-yellow-400"
                          : ["CANCELED", "RETURNED"].includes(shipment.status)
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {shipment.status === "DELIVERED"
                        ? "Delivered"
                        : shipment.status === "PICKED_UP"
                        ? "In Transit"
                        : shipment.status === "DELIVERING"
                        ? "Delivering"
                        : shipment.status === "NEW"
                        ? "New"
                        : shipment.status === "AWAITING_ALLOC"
                        ? "Pending"
                        : shipment.status === "ASSIGNED_TO_LOGISTICS"
                        ? "Assigned"
                        : shipment.status === "GOING_TO_PICKUP"
                        ? "Pickup"
                        : shipment.status === "CANCELED"
                        ? "Cancelled"
                        : shipment.status === "RETURNED"
                        ? "Returned"
                        : shipment.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>
                      {shipment.business} • {shipment.customer}
                    </div>
                    <div>
                      {shipment.origin} → {shipment.destination}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
