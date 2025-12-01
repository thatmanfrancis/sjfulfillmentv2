'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Eye, Bell, Plus, Settings,
  Users, Mail, MessageSquare, Calendar, CheckCircle,
  XCircle, Clock, AlertCircle, Send, MoreHorizontal
} from 'lucide-react';
import { get } from '@/lib/api';
import AddNotificationModal from '@/components/admin/AddNotificationModal';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recipient: 'ALL' | 'ADMIN' | 'MERCHANT' | 'LOGISTICS' | 'CUSTOMER';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SCHEDULED';
  createdAt: string;
  sentAt?: string;
  scheduledAt?: string;
  createdBy: string;
  readCount?: number;
  totalRecipients?: number;
  channels: string[];
  metadata?: any;
}

interface NotificationStats {
  totalNotifications: number;
  sentNotifications: number;
  pendingNotifications: number;
  failedNotifications: number;
  totalRecipients: number;
  readRate: number;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [searchTerm, typeFilter, statusFilter, recipientFilter, page]);

  const fetchStats = async () => {
    try {
      const data = await get('/api/admin/notifications/stats') as any;
      setStats({
        totalNotifications: data?.totalNotifications || 0,
        sentNotifications: data?.sentNotifications || 0,
        pendingNotifications: data?.pendingNotifications || 0,
        failedNotifications: data?.failedNotifications || 0,
        totalRecipients: data?.totalRecipients || 0,
        readRate: data?.readRate || 0
      });
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
      setStats({
        totalNotifications: 0,
        sentNotifications: 0,
        pendingNotifications: 0,
        failedNotifications: 0,
        totalRecipients: 0,
        readRate: 0
      });
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (recipientFilter !== 'all') params.append('recipient', recipientFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const data = await get(`/api/admin/notifications?${params}`) as any;
      setNotifications(data?.notifications || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Success'
        };
      case 'WARNING':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Warning'
        };
      case 'ERROR':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: 'Error'
        };
      case 'INFO':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Bell className="h-3 w-3" />,
          label: 'Info'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Bell className="h-3 w-3" />,
          label: type
        };
    }
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' };
      case 'HIGH':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High' };
      case 'MEDIUM':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Medium' };
      case 'LOW':
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Low' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: priority };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SENT':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Sent'
        };
      case 'PENDING':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending'
        };
      case 'FAILED':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: 'Failed'
        };
      case 'SCHEDULED':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Calendar className="h-3 w-3" />,
          label: 'Scheduled'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Clock className="h-3 w-3" />,
          label: status
        };
    }
  };

  const getRecipientIcon = (recipient: string) => {
    switch (recipient) {
      case 'ALL': return Users;
      case 'ADMIN': return Settings;
      case 'MERCHANT': return MessageSquare;
      case 'LOGISTICS': return Mail;
      case 'CUSTOMER': return Users;
      default: return Bell;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !notifications.length) {
    return (
      <div className="space-y-6 bg-black min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications Management</h1>
          <p className="text-gray-400 mt-1">Loading notification data...</p>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-black border border-[#f8c017]/20">
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
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications Management</h1>
          <p className="text-gray-400 mt-1">
            View and manage platform notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Notifications</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Bell className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalNotifications || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Sent</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.sentNotifications || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.pendingNotifications || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Failed</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.failedNotifications || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Recipients</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalRecipients || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Read Rate</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.readRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, message, or creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
              </div>
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
            <div className="min-w-40">
              <select
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Recipients</option>
                <option value="ALL">All Users</option>
                <option value="ADMIN">Admin</option>
                <option value="MERCHANT">Merchant</option>
                <option value="LOGISTICS">Logistics</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => {
          const typeInfo = getTypeInfo(notification.type);
          const priorityInfo = getPriorityInfo(notification.priority);
          const statusInfo = getStatusInfo(notification.status);
          const RecipientIcon = getRecipientIcon(notification.recipient);
          
          return (
            <Card key={notification.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Notification Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <RecipientIcon className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-white text-lg">
                        {notification.title}
                      </h3>
                      <Badge className={`${typeInfo.color} border flex items-center gap-1`}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </Badge>
                      <Badge className={`${priorityInfo.color} border`}>
                        {priorityInfo.label}
                      </Badge>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Notification Message */}
                    <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>

                    {/* Notification Details */}
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">
                          Recipients: {notification.recipient.toLowerCase()} 
                          {notification.totalRecipients && ` (${notification.totalRecipients})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Created: {formatDate(notification.createdAt)}</span>
                      </div>
                      {notification.sentAt && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Send className="h-4 w-4" />
                          <span className="text-sm">Sent: {formatDate(notification.sentAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="text-sm text-gray-500">
                      <p>Created by: {notification.createdBy}</p>
                      {notification.readCount !== undefined && notification.totalRecipients && (
                        <p>
                          Read rate: {notification.readCount}/{notification.totalRecipients} 
                          ({Math.round((notification.readCount / notification.totalRecipients) * 100)}%)
                        </p>
                      )}
                      {notification.channels && notification.channels.length > 0 && (
                        <p>Channels: {notification.channels.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {notification.status === 'PENDING' && (
                      <Button 
                        size="sm"
                        className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Now
                      </Button>
                    )}
                    {notification.status === 'FAILED' && (
                      <Button 
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-300 hover:border-red-500"
                      >
                        Retry
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:border-gray-500"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No notifications found</p>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
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
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
  );
}