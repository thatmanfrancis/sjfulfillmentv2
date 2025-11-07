"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Pagination from "@/components/Pagination";

interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  location: string;
  zone: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  lastRestocked: string;
  status: string;
  pickingPriority: string;
}

interface PickingTask {
  id: string;
  orderNumber: string;
  priority: string;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    location: string;
    picked: boolean;
  }[];
  assignedTo: string;
  status: string;
  createdAt: string;
}

export default function WarehousePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pickingTasks, setPickingTasks] = useState<PickingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    if (activeTab === "inventory") {
      fetchInventory();
    } else if (activeTab === "picking") {
      fetchPickingTasks();
    }
  }, [activeTab, currentPage, searchTerm, statusFilter]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockInventory: InventoryItem[] = [
        {
          id: "1",
          productName: "Wireless Headphones",
          sku: "WHD-001",
          location: "A1-B2-C3",
          zone: "Electronics",
          currentStock: 45,
          reservedStock: 5,
          availableStock: 40,
          reorderPoint: 10,
          lastRestocked: "2024-01-10",
          status: "in_stock",
          pickingPriority: "high"
        },
        {
          id: "2",
          productName: "Bluetooth Speaker",
          sku: "BTS-002",
          location: "A2-B1-C1",
          zone: "Electronics",
          currentStock: 8,
          reservedStock: 3,
          availableStock: 5,
          reorderPoint: 15,
          lastRestocked: "2024-01-08",
          status: "low_stock",
          pickingPriority: "medium"
        },
        {
          id: "3",
          productName: "USB Cable",
          sku: "USB-003",
          location: "B1-A3-C2",
          zone: "Accessories",
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          reorderPoint: 25,
          lastRestocked: "2024-01-05",
          status: "out_of_stock",
          pickingPriority: "urgent"
        }
      ];

      // Filter based on search and status
      const filtered = mockInventory.filter(item => {
        const matchesSearch = searchTerm === "" || 
          item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      setInventory(filtered);
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPickingTasks = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockTasks: PickingTask[] = [
        {
          id: "1",
          orderNumber: "ORD-001",
          priority: "urgent",
          items: [
            { sku: "WHD-001", productName: "Wireless Headphones", quantity: 2, location: "A1-B2-C3", picked: false },
            { sku: "USB-003", productName: "USB Cable", quantity: 1, location: "B1-A3-C2", picked: true }
          ],
          assignedTo: user?.id || "",
          status: "in_progress",
          createdAt: "2024-01-15T10:00:00Z"
        },
        {
          id: "2",
          orderNumber: "ORD-002",
          priority: "normal",
          items: [
            { sku: "BTS-002", productName: "Bluetooth Speaker", quantity: 1, location: "A2-B1-C1", picked: false }
          ],
          assignedTo: user?.id || "",
          status: "pending",
          createdAt: "2024-01-15T11:00:00Z"
        }
      ];

      setPickingTasks(mockTasks);
      setTotalCount(mockTasks.length);
      setTotalPages(Math.ceil(mockTasks.length / itemsPerPage));
    } catch (error) {
      console.error("Failed to fetch picking tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.availableStock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (item.availableStock <= item.reorderPoint) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In Stock", color: "bg-green-100 text-green-800" };
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

  const toggleItemPicked = (taskId: string, itemSku: string) => {
    setPickingTasks(prev => prev.map(task => 
      task.id === taskId 
        ? {
            ...task,
            items: task.items.map(item => 
              item.sku === itemSku ? { ...item, picked: !item.picked } : item
            )
          }
        : task
    ));
  };

  const renderInventoryTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search inventory..."
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
          <option value="all">All Items</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Reserved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    {loading ? "Loading inventory..." : "No inventory items found"}
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{item.productName}</div>
                        <div className="text-xs text-gray-400">{item.sku} • {item.zone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300 font-mono">{item.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {item.currentStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {item.reservedStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {item.availableStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-[#f08c17] hover:text-orange-500 transition-colors">
                            📦 Adjust
                          </button>
                          <button className="text-blue-400 hover:text-blue-300 transition-colors">
                            📍 Move
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPickingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {pickingTasks.filter(t => t.status === "pending").length}
          </div>
          <div className="text-sm text-gray-400">Pending Tasks</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {pickingTasks.filter(t => t.status === "in_progress").length}
          </div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {pickingTasks.filter(t => t.status === "completed").length}
          </div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
      </div>

      {/* Picking Tasks */}
      <div className="space-y-4">
        {pickingTasks.map((task) => (
          <div key={task.id} className="bg-black border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{task.orderNumber}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-sm font-semibold ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="text-sm text-gray-400">
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                  📋 Start Picking
                </button>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                  📍 Show Route
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Items to Pick:</h4>
              {task.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.picked}
                      onChange={() => toggleItemPicked(task.id, item.sku)}
                      className="rounded text-[#f08c17]"
                    />
                    <div>
                      <div className={`text-sm ${item.picked ? 'line-through text-gray-400' : 'text-white'}`}>
                        {item.productName} (x{item.quantity})
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.sku} • Location: {item.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.picked ? '✅ Picked' : '📦 To Pick'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Progress: {task.items.filter(i => i.picked).length} / {task.items.length} items
              </div>
              <button className="bg-[#f08c17] text-black px-4 py-2 rounded font-medium hover:bg-orange-500 transition-colors">
                Complete Task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && activeTab === "inventory" && inventory.length === 0) {
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
          <h1 className="text-2xl font-bold text-white">Warehouse Management</h1>
          <p className="text-gray-400">Manage inventory, picking, and warehouse operations</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors">
            📊 Export Report
          </button>
          <button className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
            📦 New Stock Adjustment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "inventory"
                ? "border-[#f08c17] text-[#f08c17]"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            📦 Inventory
          </button>
          <button
            onClick={() => setActiveTab("picking")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "picking"
                ? "border-[#f08c17] text-[#f08c17]"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            📋 Picking Lists
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "locations"
                ? "border-[#f08c17] text-[#f08c17]"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            📍 Locations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "inventory" && renderInventoryTab()}
      {activeTab === "picking" && renderPickingTab()}
      {activeTab === "locations" && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">🚧 Location Management</div>
          <p className="text-gray-500">Location mapping and zone management coming soon</p>
        </div>
      )}

      {/* Pagination */}
      {activeTab === "inventory" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={totalCount}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Quick Stats */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#f08c17]">{inventory.length}</div>
            <div className="text-sm text-gray-400">Total Items</div>
          </div>
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {inventory.filter(item => getStockStatus(item).label === "In Stock").length}
            </div>
            <div className="text-sm text-gray-400">In Stock</div>
          </div>
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {inventory.filter(item => getStockStatus(item).label === "Low Stock").length}
            </div>
            <div className="text-sm text-gray-400">Low Stock</div>
          </div>
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">
              {inventory.filter(item => getStockStatus(item).label === "Out of Stock").length}
            </div>
            <div className="text-sm text-gray-400">Out of Stock</div>
          </div>
        </div>
      )}
    </div>
  );
}