'use client';

import { useState, useEffect } from 'react';
import { get, patch } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber?: string;
  status?: string;
  order?: {
    origin?: string;
    destination?: string;
    createdAt?: string;
    estimatedDelivery?: string;
    Business?: { name: string };
    customerName?: string;
    customerAddress?: string;
    assignedLogistics?: { id: string; firstName: string; lastName: string; email: string };
  };
  lastStatusUpdate?: string;
}

export default function LogisticsShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Map UI status to backend enum
  const statusMap: Record<string, string> = {
    pending: 'AWAITING_ALLOC',
    picked_up: 'PICKED_UP',
    in_transit: 'DELIVERING',
    out_for_delivery: 'DISPATCHED',
    delivered: 'DELIVERED',
    failed: 'RETURNED',
  };

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line
  }, [statusFilter]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      // Only add status if a specific filter is selected (not 'All Statuses')
      if (statusFilter && statusFilter !== '') {
        params.append('status', statusMap[statusFilter] || statusFilter);
      }
      const data = await get<any>(`/api/shipments?${params}`);
      if (Array.isArray(data)) {
        setShipments(data);
      } else if (data && Array.isArray(data.shipments)) {
        setShipments(data.shipments);
      } else {
        setShipments([]);
      }
    } catch (error) {
      setError('Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    setStatusUpdatingId(shipmentId);
    try {
      const backendStatus = statusMap[newStatus] || newStatus;
      await patch(`/api/logistics/shipments/${shipmentId}/status`, { status: backendStatus });
      toast({ title: 'Status updated', description: `Shipment marked as ${backendStatus}` });
      fetchShipments();
    } catch (error: any) {
      toast({ title: 'Status update failed', description: error?.response?.data?.error || 'Failed to update status', variant: 'destructive' });
    } finally {
      setStatusUpdatingId(null);
    }
  };



  const getStatusBadge = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'awaiting_alloc':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Pending</Badge>;
      case 'picked_up':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Picked Up</Badge>;
      case 'delivering':
        return <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">In Transit</Badge>;
      case 'dispatched':
        return <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">Out for Delivery</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Delivered</Badge>;
      case 'returned':
        return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Failed</Badge>;
      default:
        return <Badge className="bg-gray-600/20 text-gray-300 border-gray-600/30">Unknown</Badge>;
    }
  };

  return (
    <div className="bg-black min-h-screen p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-[#f8c017]" />
            <h1 className="text-3xl font-bold text-white">My Shipments</h1>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1.5">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Logistics
          </Badge>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-4">
          <span className="text-gray-300 font-medium">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#1f1f1f] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#f8c017]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Shipments Table Card */}
        <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#f8c017]" />
              Shipments Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8c017] mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading shipments...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-red-300 font-medium mb-2">{error}</p>
                <button
                  onClick={fetchShipments}
                  className="px-4 py-2 bg-[#f8c017] text-black rounded-md hover:bg-[#f8c017]/90 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Tracking #</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Origin</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Destination</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Status</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Last Update</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Est. Delivery</th>
                      <th className="px-6 py-3 text-left text-[#f8c017] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-lg">No shipments found</p>
                          <p className="text-sm">Shipments will appear here as they are assigned</p>
                        </td>
                      </tr>
                    ) : (
                      shipments.map((shipment) => (
                        <tr key={shipment.id} className="border-t border-gray-700 hover:bg-[#232323] transition-colors">
                          <td className="px-6 py-4 text-white font-mono text-sm">
                            {shipment.trackingNumber || shipment.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-gray-300">{shipment.order?.Business?.name || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{shipment.order?.customerAddress || '-'}</td>
                          <td className="px-6 py-4">
                            {getStatusBadge(shipment.status || '')}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {shipment.lastStatusUpdate ? new Date(shipment.lastStatusUpdate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-400">-</td>
                          <td className="px-6 py-4 flex gap-2 items-center">
                            <button
                              className="text-[#f8c017] hover:text-[#f8c017]/80 font-medium px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={shipment.status === 'DELIVERED' || shipment.status === 'RETURNED'}
                            >
                              Track
                            </button>
                            <select
                              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              value={shipment.status || ''}
                              disabled={statusUpdatingId === shipment.id || shipment.status === 'DELIVERED' || shipment.status === 'RETURNED'}
                              onChange={e => handleStatusUpdate(shipment.id, e.target.value)}
                            >
                              <option value="AWAITING_ALLOC">Pending</option>
                              <option value="PICKED_UP">Picked Up</option>
                              <option value="DELIVERING">In Transit</option>
                              <option value="DISPATCHED">Out for Delivery</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="RETURNED">Failed</option>
                            </select>
                            {statusUpdatingId === shipment.id && <span className="text-xs text-gray-400 ml-2">Updating...</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}