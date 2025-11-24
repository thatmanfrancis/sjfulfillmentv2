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
import { get, patch } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Invoice {
  id: string;
  merchantId: string;
  merchantName?: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  totalDue: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PROCESSING' | 'ISSUED' | 'DRAFT';
  paymentDate?: string;
  amountPaid?: number;
  fulfillmentFees?: number;
  storageCharges?: number;
  receivingFees?: number;
  otherFees?: number;
  Business?: { id: string; name: string };
  createdAt: string;
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedInvoice) return;
    await patch(`/api/admin/invoices`, { invoiceId: selectedInvoice.id, status });
    setShowModal(false);
    fetchInvoices();
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
    <div className="min-h-screen bg-[#1a1a1a] p-8 space-y-6">
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardHeader>
          <CardTitle className="text-white">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-[#222] text-[#f8c017]">
                  <th className="p-2">Invoice ID</th>
                  <th className="p-2">Merchant</th>
                  <th className="p-2">Billing Period</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Total Due</th>
                  <th className="p-2">Amount Paid</th>
                  <th className="p-2">Payment Date</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-[#f8c017]/10">
                    <td className="p-2 text-white">{inv.id}</td>
                    <td className="p-2 text-white">{inv.Business?.name || inv.merchantName || "Unknown"}</td>
                    <td className="p-2 text-white">{inv.billingPeriod}</td>
                    <td className="p-2"><Badge className={`border ${inv.status === "PAID" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>{inv.status}</Badge></td>
                    <td className="p-2 text-white">{inv.totalDue}</td>
                    <td className="p-2 text-white">{typeof inv.amountPaid === "number" ? inv.amountPaid : "-"}</td>
                    <td className="p-2 text-white">{inv.paymentDate || "-"}</td>
                    <td className="p-2"><Button size="sm" className="bg-[#f8c017] text-black" onClick={() => handleSelectInvoice(inv)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#222] border-[#f8c017]/20">
          <DialogHeader>
            <DialogTitle className="text-[#f8c017]">Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-2">
              <div className="text-white">Invoice ID: {selectedInvoice.id}</div>
              <div className="text-white">Merchant: {selectedInvoice.Business?.name || selectedInvoice.merchantName || "Unknown"}</div>
              <div className="text-white">Billing Period: {selectedInvoice.billingPeriod}</div>
              <div className="text-white">Status: <Badge className={`border ${selectedInvoice.status === "PAID" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>{selectedInvoice.status}</Badge></div>
              <div className="text-white">Total Due: {selectedInvoice.totalDue}</div>
              <div className="text-white">Amount Paid: {typeof selectedInvoice.amountPaid === "number" ? selectedInvoice.amountPaid : "-"}</div>
              <div className="text-white">Payment Date: {selectedInvoice.paymentDate || "-"}</div>
              <div className="flex gap-2 mt-4">
                <Button className="bg-emerald-600 text-white" onClick={() => handleStatusUpdate("PAID")}>Mark as Paid</Button>
                <Button className="bg-yellow-600 text-white" onClick={() => handleStatusUpdate("OVERDUE")}>Mark as Overdue</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-[#f8c017] text-[#f8c017]" onClick={() => setShowModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}