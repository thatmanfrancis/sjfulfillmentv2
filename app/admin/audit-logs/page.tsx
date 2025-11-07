"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string | null;
  description: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: string;
}

interface AuditLogsResponse {
  auditLogs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("7days");
  const [selectedUser, setSelectedUser] = useState("all");

  const eventTypes = [
    { value: "all", label: "All Events" },
    { value: "user_login", label: "User Login" },
    { value: "user_logout", label: "User Logout" },
    { value: "user_created", label: "User Created" },
    { value: "user_updated", label: "User Updated" },
    { value: "user_deleted", label: "User Deleted" },
    { value: "role_changed", label: "Role Changed" },
    { value: "password_changed", label: "Password Changed" },
    { value: "order_created", label: "Order Created" },
    { value: "order_updated", label: "Order Updated" },
    { value: "order_cancelled", label: "Order Cancelled" },
    { value: "product_created", label: "Product Created" },
    { value: "product_updated", label: "Product Updated" },
    { value: "product_deleted", label: "Product Deleted" },
    { value: "inventory_updated", label: "Inventory Updated" },
    { value: "payment_processed", label: "Payment Processed" },
    { value: "shipment_created", label: "Shipment Created" },
    { value: "settings_changed", label: "Settings Changed" },
    { value: "security_alert", label: "Security Alert" },
    { value: "system_error", label: "System Error" },
  ];

  const dateRanges = [
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
    { value: "90days", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" },
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, selectedEventType, selectedDateRange, selectedUser]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (selectedEventType !== "all") {
        params.append("eventType", selectedEventType);
      }
      if (selectedDateRange !== "all") {
        params.append("dateRange", selectedDateRange);
      }
      if (selectedUser !== "all") {
        params.append("userId", selectedUser);
      }

      const response = await api.get(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch audit logs");
      }

      const data: AuditLogsResponse = response.data;
      setAuditLogs(data.auditLogs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-900 text-blue-300';
      case 'warning':
        return 'bg-yellow-900 text-yellow-300';
      case 'error':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-gray-900 text-gray-300';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_login':
      case 'user_logout':
        return '🔐';
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
        return '👤';
      case 'role_changed':
      case 'password_changed':
        return '🔑';
      case 'order_created':
      case 'order_updated':
      case 'order_cancelled':
        return '📦';
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
        return '🏷️';
      case 'inventory_updated':
        return '📊';
      case 'payment_processed':
        return '💳';
      case 'shipment_created':
        return '🚚';
      case 'settings_changed':
        return '⚙️';
      case 'security_alert':
        return '🚨';
      case 'system_error':
        return '❌';
      default:
        return '📋';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredLogs = auditLogs.filter(log => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.description.toLowerCase().includes(searchLower) ||
        log.userName.toLowerCase().includes(searchLower) ||
        log.userEmail.toLowerCase().includes(searchLower) ||
        log.eventType.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

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
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400">Track system activities and user actions</p>
        </div>
        <div className="text-sm text-gray-400">
          Total Events: {totalCount}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Actions</label>
            <button
              onClick={handleSearch}
              className="w-full bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Event</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">User</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Description</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Severity</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">IP Address</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getEventTypeIcon(log.eventType)}</span>
                        <span className="text-white font-medium">{log.eventType}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">{log.userName}</div>
                      <div className="text-gray-400 text-sm">{log.userEmail}</div>
                      <div className="text-gray-500 text-xs">{log.userRole}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">{log.description}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300 text-sm">{log.ipAddress}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300 text-sm">{formatTimestamp(log.timestamp)}</div>
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={20}
          totalItems={totalCount}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}