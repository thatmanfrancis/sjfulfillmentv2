"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Shipment {
  id: string;
  trackingNumber: string | null;
  carrier: string | null;
  serviceLevel: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  shippingCost: number | null;
  order: {
    orderNumber: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
    };
    shippingAddress?: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
}

interface ShipmentResponse {
  shipments: Shipment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchShipments();
  }, [statusFilter, currentPage]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await api.get(`/api/shipments?${params}`);
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch shipments");
      }

      const data: ShipmentResponse = response.data;
      setShipments(data.shipments);
      setTotalPages(data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shipments");
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const customerName = `${shipment.order.customer.firstName} ${shipment.order.customer.lastName}`;
    const matchesSearch = 
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LABEL_CREATED": return "bg-gray-900 text-gray-300";
      case "PICKED_UP": return "bg-blue-900 text-blue-300";
      case "IN_TRANSIT": return "bg-blue-900 text-blue-300";
      case "OUT_FOR_DELIVERY": return "bg-purple-900 text-purple-300";
      case "DELIVERED": return "bg-green-900 text-green-300";
      case "FAILED_DELIVERY": return "bg-red-900 text-red-300";
      case "RETURNED_TO_SENDER": return "bg-orange-900 text-orange-300";
      case "EXCEPTION": return "bg-red-900 text-red-300";
      default: return "bg-gray-900 text-gray-300";
    }
  };

  const formatDestination = (address: Shipment["order"]["shippingAddress"]) => {
    if (!address) return "N/A";
    return `${address.city || ""}, ${address.state || ""} ${address.postalCode || ""}`.trim();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <p className="text-gray-400">Track and manage package deliveries</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors">
            Export
          </button>
          <button className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
            Create Shipment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search shipments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="all">All Status</option>
          <option value="LABEL_CREATED">Label Created</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED_DELIVERY">Failed Delivery</option>
          <option value="RETURNED_TO_SENDER">Returned</option>
          <option value="EXCEPTION">Exception</option>
        </select>
      </div>

      {/* Shipments Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tracking #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Est. Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No shipments found
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {shipment.trackingNumber || "N/A"}
                      </div>
                      {shipment.shippingCost && (
                        <div className="text-xs text-gray-400">
                          ${shipment.shippingCost.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{shipment.order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {shipment.order.customer.firstName} {shipment.order.customer.lastName}
                      </div>
                      <div className="text-xs text-gray-400">{shipment.order.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {formatDestination(shipment.order.shippingAddress)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{shipment.carrier || "N/A"}</div>
                      {shipment.serviceLevel && (
                        <div className="text-xs text-gray-400">{shipment.serviceLevel}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                        {shipment.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {shipment.estimatedDeliveryDate 
                        ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString()
                        : "N/A"}
                      {shipment.actualDeliveryDate && (
                        <div className="text-xs text-green-400">
                          Delivered: {new Date(shipment.actualDeliveryDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-[#f08c17] hover:text-orange-500 transition-colors">
                          Track
                        </button>
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">{shipments.length}</div>
          <div className="text-sm text-gray-400">Total Shipments</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {shipments.filter(s => s.status === "IN_TRANSIT").length}
          </div>
          <div className="text-sm text-gray-400">In Transit</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {shipments.filter(s => s.status === "DELIVERED").length}
          </div>
          <div className="text-sm text-gray-400">Delivered</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-400">
            {shipments.filter(s => s.status === "LABEL_CREATED").length}
          </div>
          <div className="text-sm text-gray-400">Label Created</div>
        </div>
      </div>
    </div>
  );
}