"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentReference?: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  currency: {
    code: string;
    symbol: string;
  };
  invoice?: {
    invoiceNumber: string;
  };
  order?: {
    orderNumber: string;
  };
}

interface PaymentResponse {
  payments: Payment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await api.get(`/api/payments?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch payments");
      }

      const data: PaymentResponse = response.data;
      setPayments(data.payments);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-900 text-green-300";
      case "PENDING":
        return "bg-yellow-900 text-yellow-300";
      case "FAILED":
        return "bg-red-900 text-red-300";
      case "CANCELLED":
        return "bg-gray-900 text-gray-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const formatAmount = (amount: number, currency: { symbol: string; code: string }) => {
    return `${currency.symbol}${amount.toLocaleString()}`;
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

  const filteredPayments = payments.filter((payment) =>
    searchTerm === "" ||
    payment.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.order?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-gray-400">Manage and track payment transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search payments..."
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
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Reference</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Customer</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Amount</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Method</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Date</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Invoice/Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-800">
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">
                        {payment.paymentReference || payment.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white">
                        {payment.customer.firstName} {payment.customer.lastName}
                      </div>
                      <div className="text-gray-400 text-sm">{payment.customer.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </div>
                      <div className="text-gray-400 text-sm">{payment.currency.code}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">{payment.paymentMethod}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">{formatDate(payment.createdAt)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {payment.invoice?.invoiceNumber && (
                          <div>INV: {payment.invoice.invoiceNumber}</div>
                        )}
                        {payment.order?.orderNumber && (
                          <div>ORD: {payment.order.orderNumber}</div>
                        )}
                        {!payment.invoice && !payment.order && (
                          <span className="text-gray-500">-</span>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Showing {filteredPayments.length} of {payments.length} payments
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPayments(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchPayments(currentPage + 1)}
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