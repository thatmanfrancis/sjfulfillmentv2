"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";
import CreateOrderModal from "@/components/CreateOrderModal";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Currency {
  code: string;
  symbol: string;
}

interface OrderFromAPI {
  id: string;
  orderNumber: string;
  customer: Customer;
  status: string;
  totalAmount: number;
  createdAt: string;
  _count: {
    items: number;
  };
  currency: Currency;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: string;
  items: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20); // 20 items per page
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });

      const response = await api.get(`/api/orders?${params}`);
      if (response.ok) {
        const ordersFromAPI: OrderFromAPI[] = response.data.orders || [];
        
        // Transform API data to match our Order interface
        const transformedOrders: Order[] = ordersFromAPI.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          status: order.status,
          total: order.totalAmount,
          createdAt: order.createdAt,
          items: order._count.items,
        }));
        
        setOrders(transformedOrders);
        setTotalCount(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        console.error("Failed to fetch orders:", response.error);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const copyToClipboard = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedOrderNumber(orderNumber);
      setTimeout(() => setCopiedOrderNumber(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-green-100 text-green-800";
      case "delivered": return "bg-emerald-100 text-emerald-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user?.role === "MERCHANT" ? "My Orders" : "Orders"}
          </h1>
          <p className="text-gray-400">Manage and track all orders</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
        >
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    {loading ? "Loading orders..." : "No orders found"}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white font-mono">
                          {order.orderNumber}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(order.orderNumber);
                          }}
                          className="text-gray-400 hover:text-[#f08c17] transition-colors"
                          title="Copy tracking number"
                        >
                          {copiedOrderNumber === order.orderNumber ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{order.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {order.items} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-[#f08c17] hover:text-orange-500 transition-colors"
                        >
                          View
                        </button>
                        {user?.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => router.push(`/orders/${order.id}/edit`)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => router.push(`/orders/${order.id}/assign`)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                            >
                              Assign
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalCount}
        onPageChange={handlePageChange}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">{totalCount}</div>
          <div className="text-sm text-gray-400">Total Orders</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {orders.filter(o => o.status === "delivered").length}
          </div>
          <div className="text-sm text-gray-400">Delivered</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {orders.filter(o => o.status === "processing").length}
          </div>
          <div className="text-sm text-gray-400">Processing</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {orders.filter(o => o.status === "pending").length}
          </div>
          <div className="text-sm text-gray-400">Pending</div>
        </div>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchOrders(); // Refresh the orders list
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}