"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import CreateOrderModal from "@/components/CreateOrderModal";
import CreateProductModal from "@/components/CreateProductModal";
import CreateCustomerModal from "@/components/CreateCustomerModal";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { exportAnalytics, exportFinancialReport } from "@/lib/export-utils";

interface DashboardData {
  stats: {
    orders: {
      total: number;
      pending: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      today: number;
      week: number;
      month: number;
      change: string;
    };
    revenue: {
      total: string;
      totalRaw: number;
      today: string;
      todayRaw: number;
      week: string;
      weekRaw: number;
      month: string;
      monthRaw: number;
      pending: string;
      pendingRaw: number;
      change: string;
      currency: { code: string; symbol: string };
    };
    products: {
      total: number;
      active: number;
      outOfStock: number;
      lowStock: number;
      change: string;
    };
    customers: {
      total: number;
      active: number;
      newToday: number;
      newWeek: number;
      newMonth: number;
      change: string;
    };
    shipments: {
      active: number;
      deliveredToday: number;
      inTransit: number;
      failed: number;
    };
    warehouses: {
      total: number;
      active: number;
    };
    invoices: {
      total: number;
      paid: number;
      overdue: number;
      draft: number;
    };
    returns: {
      total: number;
      pending: number;
      approved: number;
    };
  };
  recentActivity: {
    orders: Array<{
      id: string;
      type: string;
      message: string;
      status: string;
      amount: string;
      time: string;
      icon: string;
    }>;
    shipments: Array<{
      id: string;
      type: string;
      message: string;
      status: string;
      time: string;
      icon: string;
    }>;
    returns: Array<{
      id: string;
      type: string;
      message: string;
      status: string;
      time: string;
      icon: string;
    }>;
  };
  lowStockAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    inventory: Array<{
      warehouse: string;
      available: number;
      threshold: number;
    }>;
  }>;
  user: {
    role: string;
    isAdmin: boolean;
    firstName: string;
    lastName: string;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportAnalytics = () => {
    if (dashboardData) {
      exportAnalytics(dashboardData);
    }
  };

  const handleExportFinancialReport = () => {
    if (dashboardData?.stats) {
      exportFinancialReport(dashboardData.stats);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/dashboard");
      console.log("Dashboard response:", response); // Debug log
      if (response.ok && response.data) {
        console.log("Dashboard full data:", response.data); // Debug log
        // API returns { success: true, data: { stats: {...}, ... } }
        // So we need to use response.data.data if it exists, otherwise response.data
        const actualData = response.data.data || response.data;
        console.log("Actual dashboard data:", actualData); // Debug log
        setDashboardData(actualData);
      } else {
        console.error("Dashboard response not ok:", response);
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    fetchDashboardData(); // Refresh dashboard data
  };

  if (!user) {
    return null; // AppLayout will handle this
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="bg-black border border-gray-700 rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-black border border-gray-700 rounded-lg p-6 animate-pulse">
              <div className="h-16 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
          <button onClick={fetchDashboardData} className="ml-4 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.stats) {
    return (
      <div className="p-4 lg:p-6">
        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg">
          Dashboard data is not available. Please try refreshing.
          <button onClick={fetchDashboardData} className="ml-4 underline">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const getRoleBasedWelcome = () => {
    switch (user.role) {
      case "ADMIN":
        return "Welcome to the Admin Dashboard";
      case "MERCHANT":
        return "Welcome to your Merchant Dashboard";
      case "MERCHANT_STAFF":
        return "Welcome to the Merchant Portal";
      case "WAREHOUSE_MANAGER":
        return "Welcome to the Warehouse Management Dashboard";
      case "LOGISTICS_PERSONNEL":
        return "Welcome to the Logistics Dashboard";
      default:
        return "Welcome to your Dashboard";
    }
  };

  const getQuickStats = () => {
    // Safety checks
    if (!dashboardData?.stats?.orders || !dashboardData?.stats?.revenue || 
        !dashboardData?.stats?.products || !dashboardData?.stats?.customers) {
      return [];
    }

    const stats = [
      {
        title: "Total Orders",
        value: dashboardData.stats.orders.total.toLocaleString(),
        subtitle: `${dashboardData.stats.orders.pending} pending`,
        change: dashboardData.stats.orders.change,
        color: "text-[#f08c17]",
        bgColor: "bg-orange-500/10",
      },
      {
        title: "Revenue",
        value: dashboardData.stats.revenue.month,
        subtitle: `${dashboardData.stats.revenue.pending} pending`,
        change: dashboardData.stats.revenue.change,
        color: "text-green-400",
        bgColor: "bg-green-500/10",
      },
      {
        title: "Products",
        value: dashboardData.stats.products.total.toLocaleString(),
        subtitle: `${dashboardData.stats.products.lowStock} low stock`,
        change: dashboardData.stats.products.change,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
      },
      {
        title: "Customers",
        value: dashboardData.stats.customers.total.toLocaleString(),
        subtitle: `${dashboardData.stats.customers.newMonth} new this month`,
        change: dashboardData.stats.customers.change,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
      },
    ];

    return stats;
  };

  const getRecentActivity = () => {
    // Safety check
    if (!dashboardData?.recentActivity) {
      return [];
    }

    // Combine all activities and sort by time
    const allActivities = [
      ...(dashboardData.recentActivity.orders || []),
      ...(dashboardData.recentActivity.shipments || []),
      ...(dashboardData.recentActivity.returns || []),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return allActivities.slice(0, 8);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#f08c17] mb-2">
              {getRoleBasedWelcome()}
            </h1>
            <p className="text-gray-300">
              Welcome back, {user.firstName}! Here's what's happening with your business today.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportFinancialReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              💰 Financial Report
            </button>
            <button 
              onClick={handleExportAnalytics}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              📊 Export Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {getQuickStats().map((stat, index) => (
          <div
            key={index}
            className="bg-black border border-gray-700 rounded-lg p-4 lg:p-6 hover:border-[#f08c17]/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <div className={`h-5 w-5 ${stat.color}`}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-400' : stat.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.title}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-black border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[#f08c17] mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getRecentActivity().length > 0 ? (
              getRecentActivity().map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                        {activity.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(parseISO(activity.time), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-black border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[#f08c17] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => setShowOrderModal(true)}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-[#f08c17]">📦</span>
                <div>
                  <p className="text-sm font-medium text-white">New Order</p>
                  <p className="text-xs text-gray-400">Create a new order</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => setShowProductModal(true)}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-[#f08c17]">📊</span>
                <div>
                  <p className="text-sm font-medium text-white">Add Product</p>
                  <p className="text-xs text-gray-400">Add new inventory</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <span className="text-[#f08c17]">👤</span>
                <div>
                  <p className="text-sm font-medium text-white">New Customer</p>
                  <p className="text-xs text-gray-400">Register customer</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left">
              <div className="flex items-center space-x-3">
                <span className="text-[#f08c17]">📈</span>
                <div>
                  <p className="text-sm font-medium text-white">View Reports</p>
                  <p className="text-xs text-gray-400">Analytics & insights</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Additional Stats Grid */}
      {dashboardData.stats.shipments && dashboardData.stats.warehouses && 
       dashboardData.stats.invoices && dashboardData.stats.returns && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Shipment Stats */}
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Shipments</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Active</span>
              <span className="text-sm font-semibold text-white">{dashboardData.stats.shipments.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">In Transit</span>
              <span className="text-sm font-semibold text-blue-400">{dashboardData.stats.shipments.inTransit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Delivered Today</span>
              <span className="text-sm font-semibold text-green-400">{dashboardData.stats.shipments.deliveredToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Failed</span>
              <span className="text-sm font-semibold text-red-400">{dashboardData.stats.shipments.failed}</span>
            </div>
          </div>
        </div>

        {/* Warehouse Stats */}
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Warehouses</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-semibold text-white">{dashboardData.stats.warehouses.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Active</span>
              <span className="text-sm font-semibold text-green-400">{dashboardData.stats.warehouses.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Low Stock Items</span>
              <span className="text-sm font-semibold text-orange-400">{dashboardData.stats.products.lowStock}</span>
            </div>
          </div>
        </div>

        {/* Invoice Stats */}
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Invoices</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-semibold text-white">{dashboardData.stats.invoices.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Paid</span>
              <span className="text-sm font-semibold text-green-400">{dashboardData.stats.invoices.paid}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Overdue</span>
              <span className="text-sm font-semibold text-red-400">{dashboardData.stats.invoices.overdue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Draft</span>
              <span className="text-sm font-semibold text-gray-400">{dashboardData.stats.invoices.draft}</span>
            </div>
          </div>
        </div>

        {/* Return Stats */}
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Returns</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-semibold text-white">{dashboardData.stats.returns.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Pending</span>
              <span className="text-sm font-semibold text-orange-400">{dashboardData.stats.returns.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Approved</span>
              <span className="text-sm font-semibold text-green-400">{dashboardData.stats.returns.approved}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Low Stock Alerts */}
      {dashboardData.lowStockAlerts && dashboardData.lowStockAlerts.length > 0 && (
        <div className="bg-black border border-red-500/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-red-400">⚠️ Low Stock Alerts</h2>
            <span className="text-sm px-3 py-1 bg-red-500/10 text-red-400 rounded-full">
              {dashboardData.lowStockAlerts.length} items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.lowStockAlerts.map((item) => (
              <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {item.inventory.map((inv, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-500">{inv.warehouse}</span>
                      <span className="text-red-400 font-medium">
                        {inv.available} / {inv.threshold}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Breakdown */}
      {dashboardData.stats.orders && (
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[#f08c17] mb-4">Order Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">{dashboardData.stats.orders.pending}</div>
            <div className="text-xs text-gray-400 mt-1">Pending</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{dashboardData.stats.orders.processing}</div>
            <div className="text-xs text-gray-400 mt-1">Processing</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{dashboardData.stats.orders.shipped}</div>
            <div className="text-xs text-gray-400 mt-1">Shipped</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{dashboardData.stats.orders.delivered}</div>
            <div className="text-xs text-gray-400 mt-1">Delivered</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{dashboardData.stats.orders.cancelled}</div>
            <div className="text-xs text-gray-400 mt-1">Cancelled</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-[#f08c17]">{dashboardData.stats.orders.today}</div>
            <div className="text-xs text-gray-400 mt-1">Today</div>
          </div>
          <div className="text-center p-3 bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-white">{dashboardData.stats.orders.week}</div>
            <div className="text-xs text-gray-400 mt-1">This Week</div>
          </div>
        </div>
      </div>
      )}

      {/* Revenue Breakdown */}
      {dashboardData.stats.revenue && (
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[#f08c17] mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-linear-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-green-400">{dashboardData.stats.revenue.total}</div>
            <div className="text-xs text-gray-500 mt-1">{dashboardData.stats.revenue.currency.code}</div>
          </div>
          <div className="p-4 bg-linear-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">This Month</div>
            <div className="text-2xl font-bold text-blue-400">{dashboardData.stats.revenue.month}</div>
            <div className="text-xs text-gray-500 mt-1">{dashboardData.stats.revenue.change}</div>
          </div>
          <div className="p-4 bg-linear-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">This Week</div>
            <div className="text-2xl font-bold text-purple-400">{dashboardData.stats.revenue.week}</div>
          </div>
          <div className="p-4 bg-linear-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-orange-400">{dashboardData.stats.revenue.pending}</div>
          </div>
        </div>
      </div>
      )}

      {/* Modals */}
      <CreateOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSuccess={handleModalSuccess}
      />
      
      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={handleModalSuccess}
      />
      
      <CreateCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}