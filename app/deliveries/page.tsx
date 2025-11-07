"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Pagination from "@/components/Pagination";

interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  status: string;
  priority: string;
  assignedTo: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  distance: number;
  route: string;
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);

  useEffect(() => {
    fetchDeliveries();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockDeliveries: Delivery[] = [
        {
          id: "1",
          orderNumber: "ORD-001",
          customerName: "John Doe",
          customerAddress: "123 Main St, Lagos, Nigeria",
          status: "pending",
          priority: "normal",
          assignedTo: user?.id || "",
          estimatedDelivery: "2024-01-15",
          distance: 5.2,
          route: "Route A"
        },
        {
          id: "2",
          orderNumber: "ORD-002",
          customerName: "Jane Smith",
          customerAddress: "456 Oak Ave, Abuja, Nigeria",
          status: "in_transit",
          priority: "urgent",
          assignedTo: user?.id || "",
          estimatedDelivery: "2024-01-14",
          distance: 12.8,
          route: "Route B"
        },
        {
          id: "3",
          orderNumber: "ORD-003",
          customerName: "Bob Johnson",
          customerAddress: "789 Pine Rd, Port Harcourt, Nigeria",
          status: "delivered",
          priority: "normal",
          assignedTo: user?.id || "",
          estimatedDelivery: "2024-01-13",
          actualDelivery: "2024-01-13",
          distance: 3.5,
          route: "Route A"
        }
      ];

      // Filter based on search and status
      const filtered = mockDeliveries.filter(delivery => {
        const matchesSearch = searchTerm === "" || 
          delivery.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      setDeliveries(filtered);
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    } catch (error) {
      console.error("Failed to fetch deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "assigned": return "bg-blue-100 text-blue-800";
      case "in_transit": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent": return "text-red-500";
      case "high": return "text-orange-500";
      case "normal": return "text-blue-500";
      case "low": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  const handleStatusUpdate = (deliveryId: string, newStatus: string) => {
    setDeliveries(prev => prev.map(delivery => 
      delivery.id === deliveryId 
        ? { ...delivery, status: newStatus, ...(newStatus === "delivered" ? { actualDelivery: new Date().toISOString().split('T')[0] } : {}) }
        : delivery
    ));
  };

  const handleBulkAssignment = () => {
    if (selectedDeliveries.length === 0) return;
    
    // Logic for bulk assignment would go here
    console.log("Bulk assigning deliveries:", selectedDeliveries);
    setSelectedDeliveries([]);
  };

  const optimizeRoute = () => {
    // Route optimization logic would go here
    console.log("Optimizing routes for assigned deliveries");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Management</h1>
          <p className="text-gray-400">Manage and track delivery assignments</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={optimizeRoute}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            🗺️ Optimize Routes
          </button>
          <button 
            onClick={handleBulkAssignment}
            disabled={selectedDeliveries.length === 0}
            className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📋 Bulk Assign ({selectedDeliveries.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {deliveries.filter(d => d.status === "pending").length}
          </div>
          <div className="text-sm text-gray-400">Pending Deliveries</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {deliveries.filter(d => d.status === "in_transit").length}
          </div>
          <div className="text-sm text-gray-400">In Transit</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {deliveries.filter(d => d.status === "delivered").length}
          </div>
          <div className="text-sm text-gray-400">Delivered Today</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">
            {deliveries.reduce((sum, d) => sum + d.distance, 0).toFixed(1)} km
          </div>
          <div className="text-sm text-gray-400">Total Distance</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search deliveries..."
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
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Deliveries Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDeliveries(deliveries.map(d => d.id));
                      } else {
                        setSelectedDeliveries([]);
                      }
                    }}
                    className="rounded text-[#f08c17]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No deliveries found
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDeliveries.includes(delivery.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDeliveries(prev => [...prev, delivery.id]);
                          } else {
                            setSelectedDeliveries(prev => prev.filter(id => id !== delivery.id));
                          }
                        }}
                        className="rounded text-[#f08c17]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{delivery.orderNumber}</div>
                      <div className="text-xs text-gray-400">{delivery.route}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{delivery.customerName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 max-w-xs truncate">{delivery.customerAddress}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={delivery.status}
                        onChange={(e) => handleStatusUpdate(delivery.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(delivery.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${getPriorityColor(delivery.priority)}`}>
                        {delivery.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {delivery.distance} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div>{new Date(delivery.estimatedDelivery).toLocaleDateString()}</div>
                      {delivery.actualDelivery && (
                        <div className="text-xs text-green-400">Delivered: {new Date(delivery.actualDelivery).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button className="text-[#f08c17] hover:text-orange-500 transition-colors">
                          📍 Track
                        </button>
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          📞 Call
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalCount}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}