'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { get } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Eye, Calendar, ShoppingCart, CheckCircle, Truck, Package, Clock, XCircle } from 'lucide-react';
import ExportOrdersModal from '@/components/merchant/ExportOrdersModal';
import OrderDetailsModal from '@/components/merchant/OrderDetailsModal';

interface Order {
  id: string;
  externalOrderId?: string;
  customerName: string;
  customerAddress?: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
}

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Add state for per-order export loading
  const [exportingOrderId, setExportingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      // Only fetch orders for the current business (handled by API auth)
      const data = await get<Order[]>(`/api/merchant/orders?${params}`);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'NEW':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="h-3 w-3" />, label: 'New' };
      case 'AWAITING_ALLOC':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="h-3 w-3" />, label: 'Awaiting Allocation' };
      case 'DISPATCHED':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Package className="h-3 w-3" />, label: 'Dispatched' };
      case 'PICKED_UP':
        return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Truck className="h-3 w-3" />, label: 'Picked Up' };
      case 'DELIVERING':
        return { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <Truck className="h-3 w-3" />, label: 'Delivering' };
      case 'DELIVERED':
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" />, label: 'Delivered' };
      case 'RETURNED':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Package className="h-3 w-3" />, label: 'Returned' };
      case 'CANCELED':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" />, label: 'Canceled' };
      case 'ON_HOLD':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock className="h-3 w-3" />, label: 'On Hold' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock className="h-3 w-3" />, label: status };
    }
  };

  const handleExportOrders = async (dateFrom: string, dateTo: string) => {
    try {
      const res = await fetch('/api/merchant/orders/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo }),
      });
      if (!res.ok) throw new Error('Failed to export orders');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders_report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export orders');
    }
  };

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Orders</h1>
          <p className="text-gray-400 mt-1">View and manage your business orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-gray-700 text-white hover:bg-gray-600" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Export Orders Modal */}
      <ExportOrdersModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportOrders}
      />

      {/* Status Filter & Search */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Input
                  placeholder="Search orders by ID or customer..."
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
                <option value="DISPATCHED">Dispatched</option>
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

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading orders...</p>
          </div>
        ) : (
          orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            return (
              <Card key={order.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-white text-lg">
                          {order.externalOrderId || `Order #${order.id.slice(0, 8)}`}
                        </h3>
                        <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                          ${order.totalAmount}
                        </Badge>
                      </div>
                      {/* Order Details */}
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <ShoppingCart className="h-4 w-4" />
                          <span className="text-sm">Customer: {order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{new Date(order.orderDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                        disabled={exportingOrderId === order.id}
                        onClick={async () => {
                          setExportingOrderId(order.id);
                          toast({
                            title: 'Exporting order...',
                            description: `Generating PDF for order #${order.externalOrderId || order.id.slice(0,8)}`,
                          });
                          try {
                            const res = await fetch(`/api/merchant/orders/${order.id}/export`);
                            if (!res.ok) throw new Error('Failed to export order');
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `order_${order.id}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                            toast({
                              title: 'Export successful',
                              description: `Order PDF downloaded.`,
                              variant: 'default',
                            });
                          } catch (err) {
                            toast({
                              title: 'Export failed',
                              description: 'Failed to export order PDF.',
                              variant: 'destructive',
                            });
                          } finally {
                            setExportingOrderId(null);
                          }
                        }}
                      >
                        {exportingOrderId === order.id ? (
                          <span className="flex items-center"><span className="animate-spin mr-1 h-4 w-4 border-b-2 border-[#f8c017] rounded-full"></span>Exporting...</span>
                        ) : (
                          <><Download className="h-4 w-4 mr-1" />Export PDF</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      {/* Order Details Modal */}
      <OrderDetailsModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={selectedOrder}
      />
    </div>
  );
}