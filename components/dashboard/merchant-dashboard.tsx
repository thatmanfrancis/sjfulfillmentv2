"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallContactAction } from "@/components/call/CallContactAction";
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  Star,
  Users,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import { get } from "@/lib/api";

interface MerchantStats {
  totalProducts: number;
  totalOrders: number;
  monthlyRevenue: number;
  growthRate: number;
  lowStockItems: number;
  pendingShipments: number;
  activeCustomers: number;
  currency: string;
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    totalAmount: number;
    status: string;
    itemCount: number;
    orderDate: string;
    items: Array<{ name: string; weightKg: number; quantity: number }>;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    weightKg: number;
    totalSold: number;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    weightKg: number;
    imageUrl?: string;
  }>;
  payments: {
    invoices: Array<any>;
    activePayments: number;
    pendingPayments: number;
    overduePayments: number;
  };
}

export function MerchantDashboard() {
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const currencySymbolMap: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
  };
  const currencySymbol = stats?.currency
    ? currencySymbolMap[stats.currency] || stats.currency
    : "₦";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await get("/api/merchant/dashboard");
      setStats(data);
    } catch (error) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-black p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Merchant Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Loading your business analytics...
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-[#2a2a2a] border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
                  <div className="h-5 w-5 bg-gray-600 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-600 rounded w-20 animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-16 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Merchant Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Business overview and management
              </p>
            </div>
          </div>
          <Card className="bg-red-900/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Dashboard
              </CardTitle>
              <CardDescription className="text-red-300">
                {error}. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-[#f8c017] text-black rounded-md hover:bg-[#f8c017]/90 transition-colors font-medium"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Unified dark dashboard styling
  return (
    <div className="bg-black p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Merchant Dashboard
            </h1>
            <p className="text-gray-300 text-lg">
              Your business overview and key metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1.5">
              <Star className="h-4 w-4 mr-1.5" />
              Top Merchant
            </Badge>
            <Badge className="bg-[#f8c017]/20 text-[#f8c017] border-[#f8c017]/30 px-3 py-1.5">
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Products */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Products
              </CardTitle>
              <div className="p-3 bg-[#f8c017]/20 rounded-xl">
                <Package className="h-5 w-5 text-[#f8c017]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {stats?.totalProducts?.toLocaleString() || "0"}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">
                  +{stats?.growthRate || 0}%
                </span>{" "}
                this month
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
                {stats?.totalOrders?.toLocaleString() || "0"}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">
                  +{stats?.growthRate || 0}%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Monthly Revenue
              </CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {currencySymbol}
                {stats?.monthlyRevenue?.toLocaleString() || "0"}
              </div>
              <p className="text-sm text-gray-400 flex items-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 mr-1" />
                <span className="text-emerald-400 font-medium">
                  +{stats?.growthRate || 0}%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-red-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Low Stock Items
              </CardTitle>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {stats?.lowStockItems || 0}
              </div>
              <p className="text-sm text-red-300">Needs restocking</p>
            </CardContent>
          </Card>

          {/* Pending Shipments */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Pending Shipments
              </CardTitle>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Truck className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {stats?.pendingShipments || 0}
              </div>
              <p className="text-sm text-blue-300">Awaiting fulfillment</p>
            </CardContent>
          </Card>

          {/* Active Customers */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Active Customers
              </CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {stats?.activeCustomers || 0}
              </div>
              <p className="text-sm text-emerald-300">Engaged this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders, Payments, Products & Quick Actions */}
        <div className="grid gap-6 md:grid-cols-4">
          {/* Recent Orders */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#f8c017]" />
                Recent Orders
              </CardTitle>
              <CardDescription className="text-gray-400">
                Latest orders placed for your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {stats?.recentOrders?.length ? (
                  stats.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-[#1f1f1f] border border-gray-700 hover:border-[#f8c017]/30 transition-colors"
                    >
                      <div className="p-2.5 rounded-full border border-blue-400 bg-blue-500/10">
                        <ShoppingCart className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          Order #{order.id}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {order.itemCount} items • {currencySymbol}
                          {order.totalAmount?.toLocaleString()}
                        </p>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <span>
                            {order.customerName} ({order.customerPhone})
                          </span>
                          {order.customerPhone ? (
                            <CallContactAction
                              contactNumber={order.customerPhone}
                              contactName={order.customerName}
                              size="icon-sm"
                            />
                          ) : null}
                        </div>
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 mt-1">
                          {order.status}
                        </span>
                        <div className="mt-2">
                          {order.items?.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-block text-xs text-gray-400 mr-2"
                            >
                              {item.name} x{item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No recent orders</p>
                    <p className="text-sm">
                      Orders will appear here as they happen
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments/Invoices */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Payments & Invoices
              </CardTitle>
              <CardDescription className="text-gray-400">
                Recent and outstanding payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-sm text-gray-300">
                <span className="mr-2">
                  Active:{" "}
                  <span className="text-emerald-400 font-bold">
                    {stats?.payments?.activePayments || 0}
                  </span>
                </span>
                <span className="mr-2">
                  Pending:{" "}
                  <span className="text-yellow-400 font-bold">
                    {stats?.payments?.pendingPayments || 0}
                  </span>
                </span>
                <span>
                  Overdue:{" "}
                  <span className="text-red-400 font-bold">
                    {stats?.payments?.overduePayments || 0}
                  </span>
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {stats?.payments?.invoices?.length ? (
                  stats.payments.invoices.map((inv, idx) => (
                    <div
                      key={inv.id || idx}
                      className="flex justify-between items-center p-2 rounded bg-[#232323] border border-gray-700 mb-1"
                    >
                      <div>
                        <div className="font-medium text-white text-xs">
                          Invoice #{inv.id}
                        </div>
                        <div className="text-xs text-gray-400">
                          {inv.status} •{" "}
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        {currencySymbol}
                        {inv.totalDue?.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-xs">
                    No invoices found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-[#f8c017]" />
                Products
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your top products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {stats?.products?.length ? (
                  stats.products.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center gap-3 p-2 rounded bg-[#232323] border border-gray-700 mb-1"
                    >
                      {prod.imageUrl && (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-xs truncate">
                          {prod.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          SKU: {prod.sku} • {prod.weightKg}kg
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-xs">
                    No products found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">
                Quick Actions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Common merchant tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full text-left p-4 rounded-lg bg-linear-to-r from-[#f8c017]/20 to-[#f8c017]/10 hover:from-[#f8c017]/30 hover:to-[#f8c017]/20 border border-[#f8c017]/30 transition-all duration-300 group">
                  <div className="font-medium text-white group-hover:text-[#f8c017]">
                    Add New Product
                  </div>
                  <div className="text-sm text-gray-400">
                    Create a new product listing
                  </div>
                </button>
                <button className="w-full text-left p-4 rounded-lg bg-[#1f1f1f] hover:bg-[#2f2f2f] border border-gray-700 hover:border-gray-600 transition-all duration-300 group">
                  <div className="font-medium text-white group-hover:text-[#f8c017]">
                    Process Pending Shipments
                  </div>
                  <div className="text-sm text-gray-400">
                    Review and fulfill shipments
                  </div>
                </button>
                <button className="w-full text-left p-4 rounded-lg bg-[#1f1f1f] hover:bg-[#2f2f2f] border border-gray-700 hover:border-gray-600 transition-all duration-300 group">
                  <div className="font-medium text-white group-hover:text-[#f8c017]">
                    Update Inventory
                  </div>
                  <div className="text-sm text-gray-400">
                    Manage stock levels
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
