'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Eye, FileText, DollarSign, 
  Calendar, Building, Mail, Clock, CheckCircle, XCircle, 
  AlertCircle, Plus, MoreHorizontal 
} from 'lucide-react';
import { get } from '@/lib/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  businessName: string;
  businessEmail: string;
  businessId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PROCESSING';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  paymentMethod?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  thisMonthRevenue: number;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [searchTerm, statusFilter, page]);

  const fetchStats = async () => {
    try {
      const data = await get('/api/admin/invoices/stats') as any;
      setStats({
        totalInvoices: data?.totalInvoices || 0,
        totalAmount: data?.totalAmount || 0,
        paidAmount: data?.paidAmount || 0,
        pendingAmount: data?.pendingAmount || 0,
        overdueAmount: data?.overdueAmount || 0,
        thisMonthRevenue: data?.thisMonthRevenue || 0
      });
    } catch (error) {
      console.error('Failed to fetch invoice stats:', error);
      setStats({
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        thisMonthRevenue: 0
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const data = await get(`/api/admin/invoices?${params}`) as any;
      setInvoices(data?.invoices || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending'
        };
      case 'PROCESSING':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Processing'
        };
      case 'PAID':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Paid'
        };
      case 'OVERDUE':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Overdue'
        };
      case 'CANCELLED':
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: 'Cancelled'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Clock className="h-3 w-3" />,
          label: status
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !invoices.length) {
    return (
      <div className="space-y-6 bg-[#1a1a1a] min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoices Management</h1>
          <p className="text-gray-400 mt-1">Loading invoice data...</p>
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
          <h1 className="text-3xl font-bold text-white">Invoices Management</h1>
          <p className="text-gray-400 mt-1">
            Manage billing and payment tracking for all merchants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export Invoices
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Invoices</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <FileText className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalInvoices || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Amount</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.totalAmount || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Paid</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.paidAmount || 0)}</div>
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
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.pendingAmount || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Overdue</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.overdueAmount || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">This Month</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.thisMonthRevenue || 0)}</div>
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
                  placeholder="Search by invoice number, business name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
              </div>
            </div>
            <div className="min-w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.map((invoice) => {
          const statusInfo = getStatusInfo(invoice.status);
          return (
            <Card key={invoice.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Invoice Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg">
                        {invoice.invoiceNumber}
                      </h3>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                        {formatCurrency(invoice.totalAmount)}
                      </Badge>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">Business: {invoice.businessName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email: {invoice.businessEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Issue Date: {formatDate(invoice.issueDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Due Date: {formatDate(invoice.dueDate)}</span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="text-sm text-gray-500">
                      {invoice.items && invoice.items.length > 0 && (
                        <p>Items: {invoice.items.length} line item(s)</p>
                      )}
                      {invoice.paidDate && (
                        <p>Paid on: {formatDate(invoice.paidDate)}</p>
                      )}
                      {invoice.paymentMethod && (
                        <p>Payment Method: {invoice.paymentMethod}</p>
                      )}
                      {invoice.notes && (
                        <p>Notes: {invoice.notes}</p>
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
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
      {invoices.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No invoices found</p>
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
    </div>
  );
}