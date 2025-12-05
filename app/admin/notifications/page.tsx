"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { get, post } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import AddNotificationModal from "@/components/admin/AddNotificationModal";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recipient: "ALL" | "ADMIN" | "MERCHANT" | "LOGISTICS" | "CUSTOMER";
  status: "PENDING" | "SENT" | "FAILED" | "SCHEDULED";
  createdAt: string;
  sentAt?: string;
  scheduledAt?: string;
  createdBy: string;
  readCount?: number;
  totalRecipients?: number;
  channels: string[];
  metadata?: any;
  isRead?: boolean;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [searchTerm, typeFilter, statusFilter, page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", "20");

      const data = (await get(`/api/admin/notifications?${params}`)) as any;
      setNotifications(data?.notifications || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return { color: "bg-emerald-100 text-emerald-700", label: "Success" };
      case "WARNING":
        return { color: "bg-yellow-100 text-yellow-700", label: "Warning" };
      case "ERROR":
        return { color: "bg-red-100 text-red-700", label: "Error" };
      case "INFO":
        return { color: "bg-blue-100 text-blue-700", label: "Info" };
      default:
        return { color: "bg-gray-100 text-gray-700", label: type };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "SENT":
        return { color: "bg-emerald-100 text-emerald-700", label: "Sent" };
      case "PENDING":
        return { color: "bg-yellow-100 text-yellow-700", label: "Pending" };
      case "FAILED":
        return { color: "bg-red-100 text-red-700", label: "Failed" };
      case "SCHEDULED":
        return { color: "bg-blue-100 text-blue-700", label: "Scheduled" };
      default:
        return { color: "bg-gray-100 text-gray-700", label: status };
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await post(`/api/admin/notifications/${notificationId}/read`, {});
      // Update the specific notification in the current state immediately
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (!searchTerm) return true;
    return (
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading && !notifications.length) {
    return (
      <div className="bg-black p-6 min-h-screen">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Notifications
            </h1>
            <p className="text-gray-300 text-lg">Loading notifications...</p>
          </div>
          <div className="w-full flex flex-col gap-4 mt-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-700 rounded animate-pulse w-full"
              />
            ))}
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
              Notifications
            </h1>
            <p className="text-gray-300 text-lg">
              View and manage platform notifications
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-gray-700 text-white"
            />
          </div>
          <div className="min-w-32">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            >
              <option value="all">All Types</option>
              <option value="INFO">Info</option>
              <option value="SUCCESS">Success</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
          <div className="min-w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
        </div>

        {/* Notifications Cards */}
        {loading ? (
          <div className="w-full flex flex-col gap-4 mt-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-700 rounded-lg animate-pulse w-full"
              />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="w-full max-w-3xl mx-auto border-2 border-[#f08c17] rounded-lg bg-[#181818] min-h-80 flex flex-col justify-center items-center py-12 px-4 mt-8">
            <h3 className="text-lg font-semibold text-white mb-2">
              No notifications found
            </h3>
            <p className="text-gray-400 text-center">
              {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No notifications available."}
            </p>
          </div>
        ) : (
          <div className="w-full mt-8 space-y-4">
            {filteredNotifications.map((notification) => {
              const typeInfo = getTypeInfo(notification.type);
              const statusInfo = getStatusInfo(notification.status);
              const isUnread = !notification.isRead;

              return (
                <div
                  key={notification.id}
                  className={`
                    relative bg-[#181818] border-2 rounded-lg p-6 transition-all duration-200 hover:bg-[#222] group
                    ${
                      isUnread
                        ? "border-[#f08c17] shadow-lg shadow-[#f08c17]/10"
                        : "border-gray-600 opacity-75 hover:opacity-100"
                    }
                  `}
                >
                  {/* Unread indicator */}
                  {isUnread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#f08c17] rounded-full animate-pulse"></div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    {/* Left Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-white font-semibold mb-2 line-clamp-1">
                        {notification.title}
                      </h3>

                      {/* Message */}
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-3">
                        {notification.message}
                      </p>

                      {/* Footer info */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>
                          {notification.createdBy === "System"
                            ? "System notification"
                            : `Created by ${notification.createdBy}`}
                        </span>
                        <span>•</span>
                        <span
                          title={format(
                            new Date(notification.createdAt),
                            "PPpp"
                          )}
                        >
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-col items-end gap-2">
                      {isUnread ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="border-[#f08c17] text-[#f08c17] hover:bg-[#f08c17] hover:text-black transition-all"
                        >
                          Mark as Read
                        </Button>
                      ) : (
                        <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-400/10 rounded">
                          ✓ Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-gray-300">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
            >
              Next
            </Button>
          </div>
        )}

        {/* Add Notification Modal */}
        <AddNotificationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNotificationAdded={fetchNotifications}
        />
      </div>
    </div>
  );
}
