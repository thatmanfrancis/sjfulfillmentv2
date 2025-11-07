"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface CallLog {
  id: string;
  callDate: string;
  outcome: string;
  duration?: number;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  order: {
    orderNumber: string;
    merchant: {
      businessName: string;
    };
  };
  customer: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  caller: {
    firstName: string;
    lastName: string;
  };
}

interface CallLogResponse {
  callLogs: CallLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function CallLogsPage() {
  const { user } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCallLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (outcomeFilter) {
        params.append("outcome", outcomeFilter);
      }

      const response = await api.get(`/api/call-logs?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch call logs");
      }

      const data: CallLogResponse = response.data;
      setCallLogs(data.callLogs);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, [outcomeFilter]);

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "SUCCESSFUL":
        return "bg-green-900 text-green-300";
      case "NO_ANSWER":
        return "bg-yellow-900 text-yellow-300";
      case "BUSY":
        return "bg-orange-900 text-orange-300";
      case "CUSTOMER_REQUEST":
        return "bg-blue-900 text-blue-300";
      case "COMPLAINT":
        return "bg-red-900 text-red-300";
      case "CANCELLED":
        return "bg-gray-900 text-gray-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  const filteredCallLogs = callLogs.filter((log) =>
    searchTerm === "" ||
    log.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.caller.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.caller.lastName.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Call Logs</h1>
          <p className="text-gray-400">Track customer communication and call outcomes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search call logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
              <option value="CUSTOMER_REQUEST">Customer Request</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Date & Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Order</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Caller</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Outcome</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Follow-up</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCallLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No call logs found
                  </td>
                </tr>
              ) : (
                filteredCallLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <div className="text-white">{formatDate(log.callDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">
                        {log.customer.firstName} {log.customer.lastName}
                      </div>
                      {log.customer.phone && (
                        <div className="text-gray-400 text-sm">{log.customer.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{log.order.orderNumber}</div>
                      <div className="text-gray-400 text-sm">{log.order.merchant.businessName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300">
                        {log.caller.firstName} {log.caller.lastName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(log.outcome)}`}>
                        {log.outcome.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300">{formatDuration(log.duration)}</div>
                    </td>
                    <td className="py-3 px-4">
                      {log.followUpRequired ? (
                        <div>
                          <div className="text-yellow-400 font-medium">Required</div>
                          {log.followUpDate && (
                            <div className="text-gray-400 text-sm">
                              {new Date(log.followUpDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-300 max-w-xs truncate">
                        {log.notes || "-"}
                      </div>
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
          <div className="text-gray-400 text-sm">Total Calls</div>
          <div className="text-2xl font-bold text-white">{callLogs.length}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Successful</div>
          <div className="text-2xl font-bold text-green-400">
            {callLogs.filter(log => log.outcome === "SUCCESSFUL").length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Follow-ups Required</div>
          <div className="text-2xl font-bold text-yellow-400">
            {callLogs.filter(log => log.followUpRequired).length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">Avg Duration</div>
          <div className="text-2xl font-bold text-blue-400">
            {formatDuration(
              Math.round(
                callLogs.reduce((acc, log) => acc + (log.duration || 0), 0) / callLogs.length
              )
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Showing {filteredCallLogs.length} of {callLogs.length} call logs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchCallLogs(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchCallLogs(currentPage + 1)}
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