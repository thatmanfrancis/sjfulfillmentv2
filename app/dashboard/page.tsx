"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import CreateOrderModal from "@/components/CreateOrderModal";
import CreateProductModal from "@/components/CreateProductModal";
import CreateCustomerModal from "@/components/CreateCustomerModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  if (!user) {
    return null; // AppLayout will handle this
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
    // Mock data - in real app, this would come from API
    const stats = [
      {
        title: "Active Orders",
        value: "245",
        change: "+12%",
        color: "text-[#f08c17]",
        bgColor: "bg-orange-500/10",
      },
      {
        title: "Total Products",
        value: "1,429",
        change: "+5%",
        color: "text-green-400",
        bgColor: "bg-green-500/10",
      },
      {
        title: "Customers",
        value: "892",
        change: "+18%",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
      },
      {
        title: "Revenue",
        value: "₦2.4M",
        change: "+23%",
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
      },
    ];

    return stats;
  };

  const getRecentActivity = () => {
    // Mock data
    return [
      {
        id: 1,
        type: "order",
        message: "New order #ORD-001 received",
        time: "2 minutes ago",
        icon: "📦",
      },
      {
        id: 2,
        type: "product",
        message: "Product inventory updated",
        time: "15 minutes ago",
        icon: "📊",
      },
      {
        id: 3,
        type: "customer",
        message: "New customer registration",
        time: "1 hour ago",
        icon: "👤",
      },
      {
        id: 4,
        type: "shipment",
        message: "Shipment SHP-445 delivered",
        time: "2 hours ago",
        icon: "🚚",
      },
    ];
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#f08c17] mb-2">
          {getRoleBasedWelcome()}
        </h1>
        <p className="text-gray-300">
          Welcome back, {user.firstName}! Here's what's happening with your business today.
        </p>
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
              <span className="text-xs text-green-400 font-medium">{stat.change}</span>
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-black border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[#f08c17] mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {getRecentActivity().map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-[#f08c17] hover:text-orange-300 transition-colors">
            View all activity
          </button>
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

      {/* System Status */}
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[#f08c17] mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">✓</div>
            <div className="text-sm text-gray-300">Authentication System</div>
            <div className="text-xs text-green-400">Online</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">✓</div>
            <div className="text-sm text-gray-300">Database Connection</div>
            <div className="text-xs text-green-400">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#f08c17] mb-1">🔒</div>
            <div className="text-sm text-gray-300">Security Status</div>
            <div className="text-xs text-orange-400">Protected</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSuccess={() => {
          // Refresh data or show success message
          console.log("Order created successfully");
        }}
      />
      
      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={() => {
          // Refresh data or show success message
          console.log("Product created successfully");
        }}
      />
      
      <CreateCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={() => {
          // Refresh data or show success message
          console.log("Customer created successfully");
        }}
      />
    </div>
  );
}