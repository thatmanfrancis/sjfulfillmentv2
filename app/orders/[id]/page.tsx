"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
}

interface Currency {
  code: string;
  symbol: string;
}

interface OrderStatusHistory {
  id: string;
  oldStatus?: string;
  newStatus: string;
  changedBy: string;
  notes?: string;
  changedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  shippingAddress: Address;
  billingAddress: Address;
  items: OrderItem[];
  currency: Currency;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  internalNotes?: string;
  priority: string;
  channel?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: OrderStatusHistory[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [editData, setEditData] = useState({
    status: "",
    paymentStatus: "",
    fulfillmentStatus: "",
    internalNotes: "",
    priority: "",
  });

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/orders/${params.id}`);
      if (response.ok) {
        setOrder(response.data.order);
        setEditData({
          status: response.data.order.status,
          paymentStatus: response.data.order.paymentStatus,
          fulfillmentStatus: response.data.order.fulfillmentStatus,
          internalNotes: response.data.order.internalNotes || "",
          priority: response.data.order.priority,
        });
      } else {
        setError(response.error || "Failed to fetch order");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!isAdmin) return;

    setUpdating(true);
    setError("");
    try {
      const response = await api.put(`/api/orders/${params.id}`, editData);
      if (response.ok) {
        setOrder(response.data.order);
        setEditing(false);
        await fetchOrder(); // Refresh to get updated history
      } else {
        setError(response.error || "Failed to update order");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("pending")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (statusLower.includes("processing")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (statusLower.includes("shipped") || statusLower.includes("fulfilled")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (statusLower.includes("delivered") || statusLower.includes("paid")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (statusLower.includes("cancelled") || statusLower.includes("failed")) return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "URGENT": return "text-red-400";
      case "HIGH": return "text-orange-400";
      case "NORMAL": return "text-gray-400";
      default: return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
          <div className="h-48 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => router.push("/orders")}
          className="mt-4 text-[#f08c17] hover:text-orange-500"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => router.push("/orders")}
            className="text-gray-400 hover:text-white mb-2 flex items-center"
          >
            ← Back to Orders
          </button>
          <h1 className="text-2xl font-bold text-white">Order {order.orderNumber}</h1>
          <p className="text-gray-400">
            Created {order.createdAt ? format(parseISO(order.createdAt), "PPp") : "N/A"}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500"
            >
              Edit Order
            </button>
          )}
          {isAdmin && editing && (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditData({
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    fulfillmentStatus: order.fulfillmentStatus,
                    internalNotes: order.internalNotes || "",
                    priority: order.priority,
                  });
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Order Status</div>
          {editing ? (
            <select
              value={editData.status}
              onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            >
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          ) : (
            <div className={`inline-flex px-3 py-1 rounded-lg border text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </div>
          )}
        </div>
        
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Payment Status</div>
          {editing ? (
            <select
              value={editData.paymentStatus}
              onChange={(e) => setEditData(prev => ({ ...prev, paymentStatus: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            >
              <option value="PENDING">Pending</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          ) : (
            <div className={`inline-flex px-3 py-1 rounded-lg border text-sm font-medium ${getStatusColor(order.paymentStatus)}`}>
              {order.paymentStatus}
            </div>
          )}
        </div>

        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Fulfillment Status</div>
          {editing ? (
            <select
              value={editData.fulfillmentStatus}
              onChange={(e) => setEditData(prev => ({ ...prev, fulfillmentStatus: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            >
              <option value="UNFULFILLED">Unfulfilled</option>
              <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="RETURNED">Returned</option>
            </select>
          ) : (
            <div className={`inline-flex px-3 py-1 rounded-lg border text-sm font-medium ${getStatusColor(order.fulfillmentStatus)}`}>
              {order.fulfillmentStatus}
            </div>
          )}
        </div>

        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Priority</div>
          {editing ? (
            <select
              value={editData.priority}
              onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          ) : (
            <div className={`text-lg font-semibold ${getPriorityColor(order.priority)}`}>
              {order.priority}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 text-sm font-medium text-gray-400">Product</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-400">SKU</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-400">Price</th>
                    <th className="text-center py-3 text-sm font-medium text-gray-400">Qty</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-white">{item.productName}</td>
                      <td className="py-3 text-gray-400 text-sm">{item.sku}</td>
                      <td className="py-3 text-right text-white">
                        {order.currency.symbol}{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 text-center text-white">{item.quantity}</td>
                      <td className="py-3 text-right font-medium text-white">
                        {order.currency.symbol}{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Totals */}
            <div className="mt-6 pt-6 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{order.currency.symbol}{order.subtotal.toFixed(2)}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>{order.currency.symbol}{order.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>{order.currency.symbol}{order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>-{order.currency.symbol}{order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-700">
                <span>Total</span>
                <span>{order.currency.symbol}{order.totalAmount.toFixed(2)} {order.currency.code}</span>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          {order.notes && (
            <div className="bg-black border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-3">Customer Notes</h2>
              <p className="text-gray-300">{order.notes}</p>
            </div>
          )}

          {/* Internal Notes - Admin Only */}
          {isAdmin && (
            <div className="bg-black border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-3">Internal Notes</h2>
              {editing ? (
                <textarea
                  value={editData.internalNotes}
                  onChange={(e) => setEditData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  rows={4}
                  placeholder="Add internal notes (visible to admins only)..."
                />
              ) : (
                <p className="text-gray-300">{order.internalNotes || "No internal notes"}</p>
              )}
            </div>
          )}

          {/* Order History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-black border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Order History</h2>
              <div className="space-y-4">
                {order.statusHistory.map((history) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-[#f08c17]"></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium">
                            Status changed to <span className="text-[#f08c17]">{history.newStatus}</span>
                          </div>
                          {history.notes && (
                            <div className="text-sm text-gray-400 mt-1">{history.notes}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {history.changedAt ? format(parseISO(history.changedAt), "PPp") : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Customer</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Name</div>
                <div className="text-white">
                  {order.customer.firstName} {order.customer.lastName}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-white">{order.customer.email}</div>
              </div>
              {order.customer.phone && (
                <div>
                  <div className="text-sm text-gray-400">Phone</div>
                  <div className="text-white">{order.customer.phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Shipping Address</h2>
            <div className="text-gray-300 space-y-1">
              <div>{order.shippingAddress.addressLine1}</div>
              {order.shippingAddress.addressLine2 && (
                <div>{order.shippingAddress.addressLine2}</div>
              )}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.countryCode}</div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Billing Address</h2>
            <div className="text-gray-300 space-y-1">
              <div>{order.billingAddress.addressLine1}</div>
              {order.billingAddress.addressLine2 && (
                <div>{order.billingAddress.addressLine2}</div>
              )}
              <div>
                {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
              </div>
              <div>{order.billingAddress.countryCode}</div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Info</h2>
            <div className="space-y-3">
              {order.channel && (
                <div>
                  <div className="text-sm text-gray-400">Channel</div>
                  <div className="text-white">{order.channel}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-400">Created</div>
                <div className="text-white">
                  {order.createdAt ? format(parseISO(order.createdAt), "PPp") : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Last Updated</div>
                <div className="text-white">
                  {order.updatedAt ? format(parseISO(order.updatedAt), "PPp") : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
