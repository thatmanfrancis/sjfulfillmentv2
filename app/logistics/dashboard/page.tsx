"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, Package, User, Building, Calendar, Eye, CheckCircle, Clock } from "lucide-react";
import { get } from "@/lib/api";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";



export default function LogisticsDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [showDelivered]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const url = showDelivered ? "/api/logistics/analytics?deliveredOnly=true" : "/api/logistics/analytics";
      const res = await get(url);
      setAnalytics(res);
    } catch (error) {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    setStatusLoading(true);
    try {
      await axios.patch(`/api/logistics/shipments/${shipmentId}/status`, { status: newStatus });
      setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      fetchAnalytics();
    } catch (err: any) {
      toast({
        title: 'Status Update Failed',
        description: err?.response?.data?.error || 'Failed to update status.',
        variant: 'destructive',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Logistics Dashboard</h1>
          <p className="text-gray-400">Your analytics and latest assignments</p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#23232b] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Products Handled</CardTitle>
            <Package className="h-5 w-5 text-[#f8c017]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{analytics?.totalProductsHandled ?? '--'}</div>
            <p className="text-sm text-gray-400">All time</p>
          </CardContent>
        </Card>
        <Card className="bg-[#23232b] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Completed Orders</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{analytics?.completedOrders ?? '--'}</div>
            <p className="text-sm text-gray-400">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-[#23232b] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{analytics?.inProgressOrders ?? '--'}</div>
            <p className="text-sm text-gray-400">Ongoing assignments</p>
          </CardContent>
        </Card>
        <Card className="bg-[#23232b] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Assigned Orders</CardTitle>
            <Truck className="h-5 w-5 text-[#f8c017]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">{analytics?.totalAssignedOrders ?? '--'}</div>
            <p className="text-sm text-gray-400">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Assignments + Delivered Toggle */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-xl font-semibold text-white">{showDelivered ? 'Delivered Shipments' : 'Latest Assignments'}</h2>
          <Button
            className="bg-[#f8c017] text-black font-semibold px-6 py-2 rounded hover:bg-[#e6b800] mx-auto"
            onClick={() => setShowDelivered((v) => !v)}
          >
            <span className="w-full block text-center">{showDelivered ? 'Back to In-Progress' : 'See All Delivered Shipments'}</span>
          </Button>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading assignments...</div>
        ) : analytics?.latestAssignments?.length === 0 ? (
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardContent className="p-12 text-center">
              <Truck className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2">No {showDelivered ? 'delivered shipments' : 'recent assignments'}</p>
              <p className="text-gray-500">{showDelivered ? 'No delivered shipments found.' : 'You have no new assignments yet.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(analytics?.latestAssignments ?? []).map((order: any) => (
              <Card key={order.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 flex flex-col justify-between h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg">
                        {order.externalOrderId || `Order #${order.id.slice(0, 8)}`}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">{order.status}</Badge>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span className="text-sm">Customer: {order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">Merchant: {order.Business?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">
                          {order.OrderItem?.length || 0} product(s)
                          {order.OrderItem && order.OrderItem.length > 0 && (
                            <span className="ml-2 text-xs text-[#f8c017]">/
                              {order.OrderItem.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} item(s)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Address: {order.customerAddress}</p>
                      {order.Warehouse && (
                        <p>Warehouse: {order.Warehouse.name} ({order.Warehouse.region})</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-6">
                    <button
                      className="px-4 py-2 rounded bg-[#f8c017] text-black font-semibold hover:bg-[#e6b800] w-full text-center"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order & Shipment Details</DialogTitle>
                <DialogDescription>
                  <span className="font-semibold">Order #{selectedOrder.externalOrderId || selectedOrder.id}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div><b>Status:</b> <Badge>{selectedOrder.status}</Badge></div>
                <div><b>Customer:</b> {selectedOrder.customerName}</div>
                <div><b>Address:</b> {selectedOrder.customerAddress}</div>
                <div><b>Phone:</b> {selectedOrder.customerPhone}</div>
                <div><b>Merchant:</b> {selectedOrder.Business?.name}</div>
                <div><b>Warehouse:</b> {selectedOrder.Warehouse?.name} ({selectedOrder.Warehouse?.region})</div>
                <div><b>Order Date:</b> {new Date(selectedOrder.orderDate).toLocaleString()}</div>
                <div><b>Items:</b>
                  <ul className="ml-4 list-disc">
                    {selectedOrder.OrderItem?.map((item: any) => {
                      // Find warehouse picks for this product
                      const picks = selectedOrder.OrderWarehousePick?.filter((pick: any) => pick.productId === item.productId) || [];
                      return (
                        <li key={item.id}>
                          {item.Product?.name} x{item.quantity}
                          {picks.length > 0 && (
                            <ul className="ml-4 list-disc text-xs text-gray-400">
                              {picks.map((pick: any) => (
                                <li key={pick.id}>
                                  {pick.quantity} from {pick.Warehouse?.name || pick.warehouseId}
                                  {pick.Warehouse?.region ? ` (${pick.Warehouse.region})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={statusLoading || selectedOrder.status === 'DELIVERED'}
                  onClick={() => handleStatusChange(selectedOrder.Shipment?.id, 'DELIVERED')}
                >
                  Mark as Delivered
                </Button>
                <Button
                  disabled={statusLoading || selectedOrder.status === 'DELIVERING'}
                  onClick={() => handleStatusChange(selectedOrder.Shipment?.id, 'DELIVERING')}
                  variant="secondary"
                >
                  Mark as Delivering
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}