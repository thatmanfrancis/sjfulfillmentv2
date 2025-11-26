'use client';
import Papa from 'papaparse';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import AssignLogisticsModal from '@/components/admin/AssignLogisticsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Eye, Package, ShoppingCart, 
  Truck, CheckCircle, XCircle, Clock, User, Building,
  Calendar, DollarSign, MoreHorizontal, AlertCircle, Plus
} from 'lucide-react';
import { get } from '@/lib/api';
import BulkOrderModal from '@/components/admin/BulkOrderModal';

interface Order {
  id: string;
  externalOrderId: string | null;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  amount?: number | any;
  cost?: number | any;
  note?: string | null;
  Business: {
    name: string;
    baseCurrency?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      sku: string;
    };
  }>;
  assignedLogistics?: {
    firstName: string;
    lastName: string;
  } | null;
  fulfillmentWarehouse?: {
    name: string;
    region: string;
  } | null;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  todayRevenue: number;
}

export default function AdminOrdersPage() {
  const { user } = useUser();
  const isAdmin = user?.role === 'ADMIN';
  // Edit/Cancel state
  // Bulk status update state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [bulkStatusError, setBulkStatusError] = useState('');

  // Bulk status update handler
  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedOrderIds.length === 0) return;
    setBulkStatusLoading(true);
    setBulkStatusError('');
    try {
      const res = await fetch('/api/admin/orders/bulk-update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds, status: bulkStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Bulk update failed');
      toast.success('Order statuses updated');
      setSelectedOrderIds([]);
      setBulkStatus('');
      fetchOrders();
    } catch (err) {
      const errorMsg = (err instanceof Error && err.message) ? err.message : String(err);
      setBulkStatusError(errorMsg || 'Bulk update failed');
      toast.error(errorMsg || 'Bulk update failed');
    } finally {
      setBulkStatusLoading(false);
    }
  };
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [editOrderData, setEditOrderData] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMerchant, setExportMerchant] = useState('');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportAllMerchants, setExportAllMerchants] = useState(true);
  const [merchants, setMerchants] = useState<{id: string, name: string}[]>([]);
  const [merchantSearch, setMerchantSearch] = useState('');
  useEffect(() => {
    if (showExportModal) {
      fetch('/api/admin/merchants')
        .then(res => res.json())
        .then(data => setMerchants(data?.merchants || []));
    }
  }, [showExportModal]);
  const [showOrderActionsMenu, setShowOrderActionsMenu] = useState(false);
  const [showOrderActionsMenuId, setShowOrderActionsMenuId] = useState<string | null>(null);
    // Edit order handler
    const handleEditOrder = (order: Order) => {
      setEditOrderData({
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        customerPhone: order.customerPhone,
      });
      setSelectedOrder(order);
      setShowEditOrderModal(true);
      setShowOrderActionsMenu(false);
      setShowOrderActionsMenuId(null);
    };

    const submitEditOrder = async () => {
      if (!selectedOrder) return;
      try {
        const res = await fetch('/api/admin/orders/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            ...editOrderData,
          }),
        });
        if (!res.ok) throw new Error('Failed to edit order');
        toast.success('Order updated');
        setShowEditOrderModal(false);
        setShowOrderModal(false);
        fetchOrders();
      } catch (err) {
        toast.error('Failed to update order');
      }
    };

    // Cancel order handler
    const handleCancelOrder = (order: Order) => {
      setSelectedOrder(order);
      setShowCancelOrderModal(true);
      setShowOrderActionsMenu(false);
      setShowOrderActionsMenuId(null);
    };

    const submitCancelOrder = async () => {
      if (!selectedOrder) return;
      try {
        const res = await fetch('/api/admin/orders/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: selectedOrder.id }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to cancel order');
        toast.success('Order canceled');
        setShowCancelOrderModal(false);
        setShowOrderModal(false);
        fetchOrders();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to cancel order');
      }
    };
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Assign Logistics Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);

  // Change Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [searchTerm, statusFilter, page]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get order counts by status
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        todayRevenueData
      ] = await Promise.all([
        get('/api/admin/orders/count'),
        get('/api/admin/orders/count?status=NEW,AWAITING_ALLOC'),
        get('/api/admin/orders/count?status=DELIVERING'),
        get('/api/admin/orders/count?status=PICKED_UP,DELIVERING'),
        get('/api/admin/orders/count?status=DELIVERED'),
        get(`/api/admin/orders/revenue?date=${today}`)
      ]);

      setStats({
        totalOrders: (totalOrders as any)?.count || 0,
        pendingOrders: (pendingOrders as any)?.count || 0,
        processingOrders: (processingOrders as any)?.count || 0,
        shippedOrders: (shippedOrders as any)?.count || 0,
        deliveredOrders: (deliveredOrders as any)?.count || 0,
        todayRevenue: (todayRevenueData as any)?.revenue || 0
      });
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
      // Set default stats if API fails
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        todayRevenue: 0
      });
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const data = await get(`/api/admin/orders?${params}`) as any;
      console.log(`Fetched Orders Data:`, data?.orders);
      setOrders(data?.orders || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'NEW':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Clock className="h-3 w-3" />,
          label: 'New'
        };
      case 'AWAITING_ALLOC':
        return { 
          color: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Awaiting Allocation'
        };
      case 'DELIVERING':
        return { 
          color: 'bg-purple-100 text-purple-700 border-purple-200', 
          icon: <Package className="h-3 w-3" />,
          label: 'Delivering'
        };
      case 'PICKED_UP':
        return { 
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
          icon: <Truck className="h-3 w-3" />,
          label: 'Picked Up'
        };
      case 'DELIVERING':
        return { 
          color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
          icon: <Truck className="h-3 w-3" />,
          label: 'Delivering'
        };
      case 'DELIVERED':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Delivered'
        };
      case 'RETURNED':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <Package className="h-3 w-3" />,
          label: 'Returned'
        };
      case 'CANCELED':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: 'Canceled'
        };
      case 'ON_HOLD':
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Clock className="h-3 w-3" />,
          label: 'On Hold'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Clock className="h-3 w-3" />,
          label: status
        };
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || 'NGN';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2
    }).format(amount);
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

  if (loading && !orders.length) {
    return (
      <div className="space-y-6 bg-black min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders Management</h1>
          <p className="text-gray-400 mt-1">Loading order data...</p>
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
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Bulk Status Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed top-0 left-0 w-full z-40 bg-[#18181b] border-b-2 border-[#f8c017] shadow-lg flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-[#f8c017]">Bulk Update</span>
            <span className="text-gray-300">{selectedOrderIds.length} order(s) selected</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            >
              <option value="">Select Status...</option>
              <option value="NEW">New</option>
              <option value="AWAITING_ALLOC">Awaiting Allocation</option>
              <option value="DELIVERING">Delivering</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="DELIVERING">Delivering</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELED">Canceled</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
            <Button
              className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80"
              disabled={bulkStatusLoading || !bulkStatus}
              onClick={handleBulkStatusUpdate}
            >
              {bulkStatusLoading ? 'Updating...' : 'Update Status'}
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
              onClick={() => { setSelectedOrderIds([]); setBulkStatus(''); }}
              disabled={bulkStatusLoading}
            >
              Cancel
            </Button>
          </div>
          {bulkStatusError && <span className="text-red-500 ml-4">{bulkStatusError}</span>}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders Management</h1>
          <p className="text-gray-400 mt-1">
            Monitor and manage all orders across the platform
          </p>
  
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowBulkOrderModal(true)}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Orders
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Orders
          </Button>
        </div>
            {/* Export Orders Modal */}
            {showExportModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border border-[#f8c017]/30">
                  <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                    onClick={() => setShowExportModal(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Download className="h-6 w-6 text-[#f8c017]" /> Export Orders Report
                  </h2>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Merchant</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={exportAllMerchants}
                        onChange={e => setExportAllMerchants(e.target.checked)}
                        className="accent-[#f8c017]"
                        id="all-merchants"
                      />
                      <label htmlFor="all-merchants" className="text-gray-300 text-sm">All Merchants</label>
                    </div>
                    {!exportAllMerchants && (
                      <>
                        <input
                          type="text"
                          placeholder="Search merchant..."
                          value={merchantSearch}
                          onChange={e => setMerchantSearch(e.target.value)}
                          className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white focus:border-[#f8c017] focus:ring-[#f8c017] mt-2 mb-2"
                        />
                        <select
                          value={exportMerchant}
                          onChange={e => setExportMerchant(e.target.value)}
                          className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                        >
                          <option value="">Select Merchant...</option>
                          {merchants
                            .filter(m => m.name.toLowerCase().includes(merchantSearch.toLowerCase()))
                            .map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Date Range</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={exportDateFrom}
                        onChange={e => setExportDateFrom(e.target.value)}
                        className="bg-[#23232b] border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={exportDateTo}
                        onChange={e => setExportDateTo(e.target.value)}
                        className="bg-[#23232b] border border-gray-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant={(!exportDateFrom && !exportDateTo) ? 'default' : 'outline'}
                        className={(!exportDateFrom && !exportDateTo) ? 'bg-[#f8c017] text-black font-bold' : 'border-gray-600 text-gray-300'}
                        onClick={() => { setExportDateFrom(''); setExportDateTo(''); }}
                      >
                        Since Merchant Joined
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80"
                      onClick={async () => {
                        const res = await fetch('/api/admin/orders/export', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            merchantId: exportMerchant,
                            dateFrom: exportDateFrom,
                            dateTo: exportDateTo,
                            allMerchants: exportAllMerchants,
                          }),
                        });
                        const data = await res.json();
                        if (!data.orders) return;
                        // Flatten orders for CSV
                        const csvData = data.orders.map((order: any) => ({
                          OrderID: order.id,
                          Merchant: order.Business?.name,
                          Customer: order.customerName,
                          Address: order.customerAddress,
                          Phone: order.customerPhone,
                          Date: order.orderDate,
                          Status: order.status,
                          Total: order.totalAmount,
                          Items: order.OrderItem.map((item: any) => `${item.Product?.sku || ''} (${item.Product?.name || ''}) x${item.quantity}`).join('; '),
                        }));
                        const csv = Papa.unparse(csvData);
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'orders_report.csv';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        setShowExportModal(false);
                      }}
                    >
                      Generate Report
                    </Button>
                    <Button
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      onClick={() => setShowExportModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Orders</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Processing</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.processingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Shipped</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.shippedOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Delivered</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.deliveredOrders || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{formatCurrency(stats?.todayRevenue || 0)}</div>
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
                  placeholder="Search orders by ID, customer, or merchant..."
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
                <option value="NEW">New</option>
                <option value="AWAITING_ALLOC">Awaiting Allocation</option>
                <option value="DELIVERING">DELIVERING</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="DELIVERING">Delivering</option>
                <option value="DELIVERED">Delivered</option>
                <option value="RETURNED">Returned</option>
                <option value="CANCELED">Canceled</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border border-gray-600 focus:z-10 focus:ring-2 focus:ring-[#f8c017] focus:text-[#f8c017] ${viewMode === 'grid' ? 'bg-[#23232b] text-[#f8c017]' : 'bg-[#1a1a1a] text-gray-300'}`}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r border-gray-600 focus:z-10 focus:ring-2 focus:ring-[#f8c017] focus:text-[#f8c017] ${viewMode === 'row' ? 'bg-[#23232b] text-[#f8c017]' : 'bg-[#1a1a1a] text-gray-300'}`}
            onClick={() => setViewMode('row')}
          >
            Row View
          </button>
        </div>
      </div>

      {/* Orders List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const isCompleted = ["DELIVERED", "RETURNED", "CANCELED"].includes(order.status);
            const isAssigned = !!order.assignedLogistics;
            const checked = selectedOrderIds.includes(order.id);
            const currency = order.Business?.baseCurrency || 'USD';
            // Only show assign button for admin users
            return (
              <Card key={order.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all flex flex-col justify-between h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedOrderIds(ids => [...ids, order.id]);
                        } else {
                          setSelectedOrderIds(ids => ids.filter(id => id !== order.id));
                        }
                      }}
                      className="accent-[#f8c017] h-4 w-4"
                      aria-label="Select order for bulk update"
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Order Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg truncate">
                        {order.externalOrderId || `Order #${order.id}`}
                      </h3>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                        {formatCurrency(order.totalAmount, currency)}
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span className="text-sm">Customer: {order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">Merchant: {order.Business.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">
                          {order.items?.length || 0} product(s)
                          {order.items && order.items.length > 0 && (
                            <span className="ml-2 text-xs text-[#f8c017]">/
                              {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} item(s)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(order.orderDate)}</span>
                      </div>
                      {/* In grid view and row view order card, add price/cost display */}
                      {(order.amount || order.cost) && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">
                            {order.amount ? `Price: ${formatCurrency(order.amount, currency)}` : ''}
                            {order.cost ? ` / Cost: ${formatCurrency(order.cost, currency)}` : ''}
                          </span>
                        </div>
                      )}
                      {/* Notes truncated to 60 chars */}
                      {order.note && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm" title={order.note}>{order.note.length > 60 ? order.note.slice(0, 60) + '...' : order.note}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Address: {order.customerAddress}</p>
                      {order.assignedLogistics && (
                        <p>Assigned to: {order.assignedLogistics.firstName} {order.assignedLogistics.lastName}</p>
                      )}
                      {order.fulfillmentWarehouse && (
                        <p>Warehouse: {order.fulfillmentWarehouse.name} ({order.fulfillmentWarehouse.region})</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                      aria-label="View order details"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                        onClick={() => {
                          setAssignOrderId(order.id);
                          setShowAssignModal(true);
                        }}
                        disabled={isCompleted || isAssigned}
                      >
                        Assign Logistics
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-blue-700 text-white hover:bg-blue-800"
                      onClick={() => {
                        setStatusOrderId(order.id);
                        setNewStatus(order.status);
                        setShowStatusModal(true);
                      }}
                    >
                      Change Status
                    </Button>
                    <div className="relative">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-gray-500"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            setShowOrderActionsMenuId(order.id);
                          }
                        }}
                        aria-label="Order actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {showOrderActionsMenuId === order.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-[#23232b] border border-[#f8c017]/30 rounded-lg shadow-lg z-10">
                          <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleEditOrder(order)}>Edit Order</button>
                          <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleCancelOrder(order)}>Cancel Order</button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const isCompleted = ["DELIVERED", "RETURNED", "CANCELED"].includes(order.status);
            const isAssigned = !!order.assignedLogistics;
            const checked = selectedOrderIds.includes(order.id);
            const currency = order.Business?.baseCurrency || 'NGN';
            return (
              <Card key={order.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col items-start mr-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedOrderIds(ids => [...ids, order.id]);
                          } else {
                            setSelectedOrderIds(ids => ids.filter(id => id !== order.id));
                          }
                        }}
                        className="accent-[#f8c017] h-4 w-4 mb-2"
                        aria-label="Select order for bulk update"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-white text-lg">
                          {order.externalOrderId || `Order #${order.id}`}
                        </h3>
                        <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                          {formatCurrency(order.totalAmount, currency)}
                        </Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Customer: {order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Building className="h-4 w-4" />
                          <span className="text-sm">Merchant: {order.Business.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Package className="h-4 w-4" />
                          <span className="text-sm">
                            {order.items?.length || 0} product(s)
                            {order.items && order.items.length > 0 && (
                              <span className="ml-2 text-xs text-[#f8c017]">/
                                {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} item(s)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(order.orderDate)}</span>
                        </div>
                        {/* In grid view and row view order card, add price/cost display */}
                        {(order.amount || order.cost) && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">
                              {order.amount ? `Price: ${formatCurrency(order.amount, currency)}` : ''}
                              {order.cost ? ` / Cost: ${formatCurrency(order.cost, currency)}` : ''}
                            </span>
                          </div>
                        )}
                        {/* Notes truncated to 60 chars */}
                        {order.note && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm" title={order.note}>{order.note.length > 60 ? order.note.slice(0, 60) + '...' : order.note}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>Address: {order.customerAddress}</p>
                        {order.assignedLogistics && (
                          <p>Assigned to: {order.assignedLogistics.firstName} {order.assignedLogistics.lastName}</p>
                        )}
                        {order.fulfillmentWarehouse && (
                          <p>Warehouse: {order.fulfillmentWarehouse.name} ({order.fulfillmentWarehouse.region})</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-40 items-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                        onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                        aria-label="View order details"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                        onClick={() => {
                          setAssignOrderId(order.id);
                          setShowAssignModal(true);
                        }}
                        disabled={isCompleted || isAssigned}
                      >
                        Assign Logistics
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-700 text-white hover:bg-blue-800"
                        onClick={() => {
                          setStatusOrderId(order.id);
                          setNewStatus(order.status);
                          setShowStatusModal(true);
                        }}
                      >
                        Change Status
                      </Button>
                      <div className="relative">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-gray-500"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              setShowOrderActionsMenuId(order.id);
                            }
                          }}
                          aria-label="Order actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {showOrderActionsMenuId === order.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-[#23232b] border border-[#f8c017]/30 rounded-lg shadow-lg z-10">
                            <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleEditOrder(order)}>Edit Order</button>
                            <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleCancelOrder(order)}>Cancel Order</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Assign Logistics Modal */}
      {/* Assign Logistics Modal - admin only, strict validation */}
      {user?.role === 'ADMIN' && (
        <AssignLogisticsModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          orderId={assignOrderId}
          onAssigned={() => {
            setShowAssignModal(false);
            setAssignOrderId(null);
            fetchOrders();
          }}
        />
      )}

      {/* Change Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={() => setShowStatusModal(false)}>
        <DialogContent className="bg-[#18181b] border-2 border-[#f8c017] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Change Order Status</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-1">Select new status</label>
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            >
              <option value="NEW">New</option>
              <option value="AWAITING_ALLOC">Awaiting Allocation</option>
              <option value="DELIVERING">DELIVERING</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="DELIVERING">Delivering</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELED">Canceled</option>
              <option value="ON_HOLD">On Hold</option>
              {/* Allow admin to revert to DELIVERING from completed */}
              {['DELIVERED', 'RETURNED', 'CANCELED'].includes(newStatus) && (
                <option value="DELIVERING">Delivering</option>
              )}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80"
              disabled={statusLoading}
              onClick={async () => {
                if (!statusOrderId || !newStatus) return;
                setStatusLoading(true);
                try {
                  const res = await fetch(`/api/orders/${statusOrderId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                  });
                  if (!res.ok) throw new Error('Failed to update status');
                  setShowStatusModal(false);
                  setStatusOrderId(null);
                  fetchOrders();
                } catch (err) {
                  // Optionally show error
                } finally {
                  setStatusLoading(false);
                }
              }}
            >
              {statusLoading ? 'Updating...' : 'Update Status'}
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
              onClick={() => setShowStatusModal(false)}
              disabled={statusLoading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No orders found</p>
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
      
      {/* Bulk Order Modal */}
      <BulkOrderModal 
        isOpen={showBulkOrderModal}
        onClose={() => setShowBulkOrderModal(false)}
        onOrdersCreated={() => {
          fetchOrders();
          fetchStats();
        }}
      />
      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border border-[#f8c017]/30">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
              onClick={() => setShowOrderModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Order <span className="text-[#f8c017]">#{selectedOrder.id}</span>
            </h2>
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-400">
                <User className="h-4 w-4" />
                <span className="text-sm">Customer: <span className="text-white font-semibold">{selectedOrder.customerName}</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Building className="h-4 w-4" />
                <span className="text-sm">Merchant: <span className="text-white font-semibold">{selectedOrder.Business.name}</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Package className="h-4 w-4" />
                <span className="text-sm">
                  {selectedOrder.items?.length || 0} product(s)
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <span className="ml-2 text-xs text-[#f8c017]">/
                      {selectedOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} item(s)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{formatDate(selectedOrder.orderDate)}</span>
              </div>
              {/* In order details modal, add price/cost display */}
              {(selectedOrder.amount || selectedOrder.cost) && (
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedOrder.amount ? `Price: ${formatCurrency(selectedOrder.amount, selectedOrder.Business?.baseCurrency || 'NGN')}` : ''}
                    {selectedOrder.cost ? ` / Cost: ${formatCurrency(selectedOrder.cost, selectedOrder.Business?.baseCurrency || 'NGN')}` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-1">Customer Address:</div>
              <div className="text-white text-sm mb-2">{selectedOrder.customerAddress}</div>
              <div className="text-gray-400 text-xs mb-1">Phone:</div>
              <div className="text-white text-sm mb-2">{selectedOrder.customerPhone}</div>
              {selectedOrder.note && (
                <div className="mt-2">
                  <div className="text-gray-400 text-xs mb-1">Order Notes:</div>
                  <div className="text-white text-sm whitespace-pre-line">{selectedOrder.note}</div>
                </div>
              )}
            </div>
            <div className="mb-4">
              <div className="text-gray-400 text-xs mb-1">Ordered Items:</div>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <ul className="divide-y divide-[#f8c017]/10">
                  {selectedOrder.items.map((item, idx) => (
                    <li key={item.id || idx} className="py-2 flex items-center gap-3">
                      <span className="font-mono text-yellow-400 bg-yellow-900/20 rounded px-2 py-0.5 text-xs">{item.product?.sku || '-'}</span>
                      <span className="text-white font-semibold">{item.product?.name || '-'}</span>
                      <span className="ml-auto text-[#f8c017] font-bold">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500 text-sm italic py-2">No products in this order.</div>
              )}
            </div>
              <div className="flex items-center justify-between mt-6">
                <span className="text-lg font-bold text-white">Total: {formatCurrency(selectedOrder.totalAmount, selectedOrder.Business?.baseCurrency || 'NGN')}</span>
                <div className="relative">
                  <Button
                    size="sm"
                    className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80"
                    onClick={() => setShowOrderActionsMenu((v: any) => !v)}
                    aria-label="Order actions"
                  >
                    More
                  </Button>
                  {showOrderActionsMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-[#23232b] border border-[#f8c017]/30 rounded-lg shadow-lg z-10">
                      <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleEditOrder(selectedOrder!)}>Edit Order</button>
                      <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#f8c017]/10" onClick={() => handleCancelOrder(selectedOrder!)}>Cancel Order</button>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal (always at root) */}
      {showEditOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border border-[#f8c017]/30">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
              onClick={() => setShowEditOrderModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">Edit Order #{selectedOrder.id}</h2>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">Customer Name</label>
              <input className="w-full p-2 rounded bg-[#23232b] border border-gray-600 text-white" value={editOrderData?.customerName || ''} onChange={e => setEditOrderData((d: any) => ({ ...d, customerName: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">Customer Address</label>
              <input className="w-full p-2 rounded bg-[#23232b] border border-gray-600 text-white" value={editOrderData?.customerAddress || ''} onChange={e => setEditOrderData((d: any) => ({ ...d, customerAddress: e.target.value }))} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">Customer Phone</label>
              <input className="w-full p-2 rounded bg-[#23232b] border border-gray-600 text-white" value={editOrderData?.customerPhone || ''} onChange={e => setEditOrderData((d: any) => ({ ...d, customerPhone: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80" onClick={submitEditOrder}>Save</Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]" onClick={() => setShowEditOrderModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal (always at root) */}
      {showCancelOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-[#f8c017]/30">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
              onClick={() => setShowCancelOrderModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">Cancel Order #{selectedOrder.id}?</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button className="bg-red-600 text-white font-bold hover:bg-red-700" onClick={submitCancelOrder}>Yes, Cancel Order</Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]" onClick={() => setShowCancelOrderModal(false)}>No, Go Back</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}