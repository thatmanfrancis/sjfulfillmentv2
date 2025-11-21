'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Eye, BarChart3, Plus, TrendingUp,
  Users, DollarSign, Package, ShoppingCart, Calendar, MapPin,
  Clock, FileText, Target, Zap, Activity, ArrowUpRight,
  ArrowDownRight, MoreHorizontal, Printer, Share2
} from 'lucide-react';
import { get } from '@/lib/api';
import AddReportModal from '@/components/admin/AddReportModal';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'FINANCIAL' | 'SALES' | 'INVENTORY' | 'USER' | 'LOGISTICS' | 'ANALYTICS' | 'CUSTOM';
  category: 'REVENUE' | 'EXPENSES' | 'PRODUCTS' | 'CUSTOMERS' | 'MERCHANTS' | 'ORDERS' | 'SHIPMENTS' | 'PERFORMANCE';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  schedule?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
  createdBy: string;
  downloadUrl?: string;
  fileSize?: number;
  parameters?: any;
  isPublic: boolean;
  recipients?: string[];
}

interface ReportStats {
  totalReports: number;
  completedReports: number;
  scheduledReports: number;
  failedReports: number;
  totalDownloads: number;
  automatedReports: number;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [searchTerm, typeFilter, statusFilter, categoryFilter, page]);

  const fetchStats = async () => {
    try {
      const data = await get('/api/admin/reports/stats') as any;
      setStats({
        totalReports: data?.totalReports || 0,
        completedReports: data?.completedReports || 0,
        scheduledReports: data?.scheduledReports || 0,
        failedReports: data?.failedReports || 0,
        totalDownloads: data?.totalDownloads || 0,
        automatedReports: data?.automatedReports || 0
      });
    } catch (error) {
      console.error('Failed to fetch report stats:', error);
      setStats({
        totalReports: 0,
        completedReports: 0,
        scheduledReports: 0,
        failedReports: 0,
        totalDownloads: 0,
        automatedReports: 0
      });
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const data = await get(`/api/admin/reports?${params}`) as any;
      setReports(data?.reports || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'FINANCIAL':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <DollarSign className="h-3 w-3" />,
          label: 'Financial'
        };
      case 'SALES':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <TrendingUp className="h-3 w-3" />,
          label: 'Sales'
        };
      case 'INVENTORY':
        return { 
          color: 'bg-purple-100 text-purple-700 border-purple-200', 
          icon: <Package className="h-3 w-3" />,
          label: 'Inventory'
        };
      case 'USER':
        return { 
          color: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: <Users className="h-3 w-3" />,
          label: 'User'
        };
      case 'LOGISTICS':
        return { 
          color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
          icon: <MapPin className="h-3 w-3" />,
          label: 'Logistics'
        };
      case 'ANALYTICS':
        return { 
          color: 'bg-pink-100 text-pink-700 border-pink-200', 
          icon: <BarChart3 className="h-3 w-3" />,
          label: 'Analytics'
        };
      case 'CUSTOM':
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Target className="h-3 w-3" />,
          label: 'Custom'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <FileText className="h-3 w-3" />,
          label: type
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <Download className="h-3 w-3" />,
          label: 'Completed'
        };
      case 'PROCESSING':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Activity className="h-3 w-3" />,
          label: 'Processing'
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
          icon: <ArrowDownRight className="h-3 w-3" />,
          label: 'Failed'
        };
      case 'SCHEDULED':
        return { 
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
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

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return <FileText className="h-4 w-4 text-red-500" />;
      case 'EXCEL': return <FileText className="h-4 w-4 text-green-500" />;
      case 'CSV': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'JSON': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  if (loading && !reports.length) {
    return (
      <div className="space-y-6 bg-[#1a1a1a] min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports Management</h1>
          <p className="text-gray-400 mt-1">Loading reports data...</p>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports Management</h1>
          <p className="text-gray-400 mt-1">
            Generate, schedule, and manage business reports across all modules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Builder
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Reports</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <FileText className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalReports || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Completed</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Download className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.completedReports || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Scheduled</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.scheduledReports || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Failed</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.failedReports || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Downloads</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalDownloads || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Automated</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.automatedReports || 0}</div>
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
                  placeholder="Search by name, description, or creator..."
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
                <option value="FINANCIAL">Financial</option>
                <option value="SALES">Sales</option>
                <option value="INVENTORY">Inventory</option>
                <option value="USER">User</option>
                <option value="LOGISTICS">Logistics</option>
                <option value="ANALYTICS">Analytics</option>
                <option value="CUSTOM">Custom</option>
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
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
            <div className="min-w-40">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Categories</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSES">Expenses</option>
                <option value="PRODUCTS">Products</option>
                <option value="CUSTOMERS">Customers</option>
                <option value="MERCHANTS">Merchants</option>
                <option value="ORDERS">Orders</option>
                <option value="SHIPMENTS">Shipments</option>
                <option value="PERFORMANCE">Performance</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => {
          const typeInfo = getTypeInfo(report.type);
          const statusInfo = getStatusInfo(report.status);
          
          return (
            <Card key={report.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Report Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {getFormatIcon(report.format)}
                      <h3 className="font-semibold text-white text-lg">
                        {report.name}
                      </h3>
                      <Badge className={`${typeInfo.color} border flex items-center gap-1`}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </Badge>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      {report.isPublic && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          Public
                        </Badge>
                      )}
                      {report.schedule && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {report.schedule}
                        </Badge>
                      )}
                    </div>

                    {/* Report Description */}
                    <p className="text-gray-300 text-sm leading-relaxed">{report.description}</p>

                    {/* Report Details */}
                    <div className="grid gap-2 md:grid-cols-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Creator: {report.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Created: {formatDate(report.createdAt)}</span>
                      </div>
                      {report.lastRun && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Last Run: {formatDate(report.lastRun)}</span>
                        </div>
                      )}
                      {report.nextRun && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Next Run: {formatDate(report.nextRun)}</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center gap-6">
                        <p>Format: {report.format}</p>
                        <p>Category: {report.category}</p>
                        {report.fileSize && <p>Size: {formatFileSize(report.fileSize)}</p>}
                        {report.recipients && report.recipients.length > 0 && (
                          <p>Recipients: {report.recipients.length}</p>
                        )}
                      </div>
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
                    {report.status === 'COMPLETED' && report.downloadUrl && (
                      <Button 
                        size="sm"
                        className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {report.status === 'FAILED' && (
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
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
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
      {reports.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No reports found</p>
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

      {/* Add Report Modal */}
      <AddReportModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onReportAdded={fetchReports}
      />
    </div>
  );
}