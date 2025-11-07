"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface PickingTask {
  id: string;
  orderNumber: string;
  priority: string;
  status: string;
  customer: {
    name: string;
    email: string;
  };
  merchant: {
    name: string;
  };
  createdAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    pickedQuantity: number;
    availableQuantity: number;
    warehouse: string;
    location: string;
  }[];
}

export default function PickingTasksPage() {
  const [tasks, setTasks] = useState<PickingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [pickingQuantities, setPickingQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/warehouse/picking-tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      setTasks(response.data.tasks);
    } catch (err) {
      setError("Failed to load picking tasks");
    } finally {
      setLoading(false);
    }
  };

  const handlePickTask = async (task: PickingTask) => {
    try {
      setProcessing(task.id);
      
      const items = task.items.map(item => ({
        id: item.id,
        productId: item.productId,
        pickedQuantity: pickingQuantities[item.id] || item.quantity
      }));

      const response = await api.post("/api/warehouse/picking-tasks", {
        orderId: task.id,
        items,
        warehouseId: "warehouse-1" // You might want to make this dynamic
      });

      if (!response.ok) throw new Error("Failed to process picking");

      await fetchTasks();
      setSelectedTask(null);
      setPickingQuantities({});
    } catch (err) {
      setError("Failed to process picking task");
    } finally {
      setProcessing(null);
    }
  };

  const updatePickingQuantity = (itemId: string, quantity: number) => {
    setPickingQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "destructive";
      case "MEDIUM": return "default";
      case "LOW": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "default";
      case "PROCESSING": return "secondary";
      case "PACKED": return "secondary";
      case "SHIPPED": return "default";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Picking Tasks</h1>
        <p className="text-gray-400">Manage warehouse picking operations for pending orders</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-black border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-white mb-2">No picking tasks</h3>
            <p className="text-gray-400">
              All orders are up to date. New orders will appear here when they need picking.
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`bg-black border rounded-lg p-6 ${selectedTask === task.id ? 'border-[#f08c17]' : 'border-gray-700'}`}>
              {/* Task Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    📦 Order #{task.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Customer & Merchant Info */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">👤 Customer:</span>
                  <span className="text-white">{task.customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">🏢 Merchant:</span>
                  <span className="text-white">{task.merchant.name}</span>
                </div>
              </div>

              {selectedTask === task.id ? (
                <div className="space-y-4 border-t border-gray-700 pt-4">
                  <h4 className="font-semibold text-white">Items to Pick</h4>
                  <div className="space-y-3">
                    {task.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-white">{item.productName}</p>
                          <p className="text-sm text-gray-400">SKU: {item.sku}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="flex items-center gap-1 text-gray-400">
                              📍 {item.location || "No location"}
                            </span>
                            <span className="text-gray-400">Available: {item.availableQuantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Pick:</span>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(item.quantity, item.availableQuantity)}
                            defaultValue={item.quantity}
                            onChange={(e) => updatePickingQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-black border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                          />
                          <span className="text-sm text-gray-400">/ {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handlePickTask(task)}
                      disabled={processing === task.id}
                      className="flex-1 bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                    >
                      {processing === task.id ? (
                        <>⏳ Processing...</>
                      ) : (
                        <>✅ Complete Picking</>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    <strong className="text-white">{task.items.length}</strong> items to pick
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {task.items.slice(0, 3).map(item => (
                      <span key={item.id} className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded">
                        {item.productName}
                      </span>
                    ))}
                    {task.items.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded">
                        +{task.items.length - 3} more
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedTask(task.id)}
                    className="w-full bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors mt-3"
                  >
                    🚀 Start Picking
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}