"use client";
import { useEffect, useState } from "react";
import { get } from '@/lib/api';
import { Dialog } from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';

function getStatusColor(status: any) {
  switch ((status || '').toLowerCase()) {
    case 'awaiting_alloc': return 'bg-yellow-600';
    case 'picked_up': return 'bg-blue-600';
    case 'delivering': return 'bg-purple-600';
    case 'dispatched': return 'bg-orange-600';
    case 'delivered': return 'bg-green-600';
    case 'returned': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
}

export default function AdminShipmentPage() {
  const [shipments, setShipments] = useState([]);
  const [selected, setSelected]: any = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all'|'delivered'|'returned'|'inprocess'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line
  }, [tab, page]);

  const fetchShipments = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '20');
    if (tab === 'delivered') params.append('status', 'DELIVERED');
    else if (tab === 'returned') params.append('status', 'RETURNED');
    else if (tab === 'inprocess') params.append('status', 'PICKED_UP,DELIVERING,DISPATCHED');
    // 'all' tab: no status param
    const data: any = await get('/api/admin/shipments?' + params.toString());
    setShipments(data?.shipments || []);
    setTotalPages(data?.pagination?.pages || 1);
    setLoading(false);
  };

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Shipments</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={tab==='all'?'default':'outline'} onClick={()=>{setTab('all');setPage(1);}}>All</Button>
        <Button variant={tab==='delivered'?'default':'outline'} onClick={()=>{setTab('delivered');setPage(1);}}>Delivered</Button>
        <Button variant={tab==='returned'?'default':'outline'} onClick={()=>{setTab('returned');setPage(1);}}>Returned</Button>
        <Button variant={tab==='inprocess'?'default':'outline'} onClick={()=>{setTab('inprocess');setPage(1);}}>In Process</Button>
      </div>

      {/* Shipments Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading shipments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-brand-gold">Tracking #</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Order #</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Customer</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Address</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Status</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Last Update</th>
                  <th className="px-6 py-3 text-left text-brand-gold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment: any) => (
                  <tr key={shipment.id} className="border-t border-gray-700 hover:bg-gray-900">
                    <td className="px-6 py-4 text-white font-mono text-sm">
                      {shipment.trackingNumber || shipment.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{shipment.order?.id || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{shipment.order?.customerName || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{shipment.order?.customerAddress || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(shipment.status || '')}`}>
                        {(shipment.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {shipment.lastStatusUpdate ? new Date(shipment.lastStatusUpdate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Button size="sm" onClick={() => setSelected(shipment)} className="text-brand-gold hover:text-brand-gold/80">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination Controls */}
        <div className="flex justify-center items-center gap-2 py-4">
          <Button disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button>
          <span className="text-white">Page {page} of {totalPages}</span>
          <Button disabled={page>=totalPages} onClick={()=>setPage(page+1)}>Next</Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-2">Shipment Details</h2>
            <div><b>Tracking #:</b> {selected.trackingNumber}</div>
            <div><b>Status:</b> {selected.status}</div>
            <div><b>Order #:</b> {selected.Order?.id}</div>
            <div><b>Order Customer:</b> {selected.Order?.customerName}</div>
            <div><b>Order Address:</b> {selected.Order?.customerAddress}</div>
            <div><b>Order Items:</b>
              <ul className="ml-4 list-disc">
                {selected.Order?.OrderItem?.map((item: any) => (
                  <li key={item.id}>{item.Product?.name} x{item.quantity}</li>
                ))}
              </ul>
            </div>
            <Button className="mt-4" onClick={() => setSelected(null)}>Close</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
