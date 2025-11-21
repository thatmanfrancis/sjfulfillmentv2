"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Bell, CheckCircle, XCircle, Clock, AlertCircle, Calendar, Users, MessageSquare, Eye, MoreHorizontal
} from "lucide-react";
import { get } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  priority: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  channels: string[];
}

export default function MerchantNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, [searchTerm]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "40");
      const data = await get(`/api/merchant/notifications?${params}`) as any;
      setNotifications(data?.notifications || []);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return {
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: <CheckCircle className="h-3 w-3" />,
          label: "Success",
        };
      case "WARNING":
        return {
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Warning",
        };
      case "ERROR":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: <XCircle className="h-3 w-3" />,
          label: "Error",
        };
      case "INFO":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: <Bell className="h-3 w-3" />,
          label: "Info",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <Bell className="h-3 w-3" />,
          label: type,
        };
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

  if (loading && !notifications.length) {
    return (
      <div className="space-y-6 bg-[#1a1a1a] min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">Loading notification data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#1a1a1a] min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">All notifications for your merchant account</p>
        </div>
      </div>
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((notification) => {
          const typeInfo = getTypeInfo(notification.type);
          return (
            <Card key={notification.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Bell className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-white text-lg">{notification.title}</h3>
                      <Badge className={`${typeInfo.color} border flex items-center gap-1`}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>
                    {/* Removed created at, sent at, and channels display */}
                  </div>
                  {/* Removed View and Menu icons */}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {notifications.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No notifications found</p>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
