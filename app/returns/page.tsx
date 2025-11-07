"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Return {
  id: string;
  returnNumber: string;
  reason: string;
  status: string;
  quantity: number;
  refundAmount?: number;
  createdAt: string;
  processedAt?: string;
  order: {
    orderNumber: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  orderItem: {
    quantity: number;
    price: number;
    product: {
      name: string;
      sku: string;
    };
  };
  merchant: {
    businessName: string;
  };
}

interface ReturnResponse {
  returns: Return[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ReturnsPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReturns = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) {
        params.append("status", statusFilter);
      }
      if (reasonFilter) {
        params.append("reason", reasonFilter);
      }

      const response = await api.get(`/api/returns?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch returns");
      }

      const data: ReturnResponse = response.data;
      setReturns(data.returns);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, reasonFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-900 text-green-300";
      case "PENDING":
        return "bg-yellow-900 text-yellow-300";
      case "REJECTED":
        return "bg-red-900 text-red-300";
      case "PROCESSING":
        return "bg-blue-900 text-blue-300";
      case "COMPLETED":
        return "bg-green-900 text-green-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case "DEFECTIVE":
        return "bg-red-900 text-red-300";
      case "WRONG_ITEM":
        return "bg-orange-900 text-orange-300";
      case "NOT_AS_DESCRIBED":
        return "bg-yellow-900 text-yellow-300";
      case "DAMAGED_IN_SHIPPING":
        return "bg-red-900 text-red-300";
      case "CUSTOMER_CHANGED_MIND":
        return "bg-blue-900 text-blue-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredReturns = returns.filter((returnItem) =>
    searchTerm === "" ||
    returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.order.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.order.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.orderItem.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Returns Management</h1>
          <p className="text-gray-400">Track and process product returns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="">All Reasons</option>
          <option value="DEFECTIVE">Defective</option>
          <option value="WRONG_ITEM">Wrong Item</option>
          <option value="NOT_AS_DESCRIBED">Not as Described</option>
          <option value="DAMAGED_IN_SHIPPING">Damaged in Shipping</option>
          <option value="CUSTOMER_CHANGED_MIND">Changed Mind</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Return #</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Order</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Customer</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Product</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Reason</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Quantity</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Refund</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    No returns found
                  </td>
                </tr>
              ) : (
                filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-800">
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">
                        {returnItem.returnNumber}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white">{returnItem.order.orderNumber}</div>
                      {user?.role === "ADMIN" && (
                        <div className="text-gray-400 text-sm">{returnItem.merchant.businessName}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white">
                        {returnItem.order.customer.firstName} {returnItem.order.customer.lastName}
                      </div>
                      <div className="text-gray-400 text-sm">{returnItem.order.customer.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white">{returnItem.orderItem.product.name}</div>
                      <div className="text-gray-400 text-sm">SKU: {returnItem.orderItem.product.sku}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(returnItem.reason)}`}>
                        {returnItem.reason.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                        {returnItem.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">{returnItem.quantity}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {returnItem.refundAmount ? `$${returnItem.refundAmount.toFixed(2)}` : "Pending"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">{formatDate(returnItem.createdAt)}</div>
                      {returnItem.processedAt && (
                        <div className="text-gray-500 text-sm">
                          Processed: {formatDate(returnItem.processedAt)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Total Returns</div>
          <div className="text-2xl font-bold text-white">{returns.length}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Pending</div>
          <div className="text-2xl font-bold text-yellow-400">
            {returns.filter(r => r.status === "PENDING").length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Approved</div>
          <div className="text-2xl font-bold text-green-400">
            {returns.filter(r => r.status === "APPROVED").length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Completed</div>
          <div className="text-2xl font-bold text-blue-400">
            {returns.filter(r => r.status === "COMPLETED").length}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Showing {filteredReturns.length} of {returns.length} returns
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchReturns(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchReturns(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}