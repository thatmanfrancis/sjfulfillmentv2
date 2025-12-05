"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CallContactAction } from "@/components/call/CallContactAction";
import {
  MapPin,
  Package,
  Users,
  Truck,
  Calendar,
  Phone,
  Mail,
  Building,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { get } from "@/lib/api";

interface Warehouse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  region: string;
  capacity: number;
  currentStock: number;
  manager?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "UNDER_CONSTRUCTION";
  type: "FULFILLMENT" | "STORAGE" | "DISTRIBUTION" | "CROSS_DOCK";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalOrders: number;
  pendingShipments: number;
  utilizationRate: number;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "STOCK_IN" | "STOCK_OUT" | "TRANSFER" | "ORDER";
    description: string;
    timestamp: string;
  }>;
}

interface WarehouseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onEdit?: () => void;
}

export default function WarehouseViewModal({
  isOpen,
  onClose,
  warehouse,
  onEdit,
}: WarehouseViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "activity"
  >("overview");

  useEffect(() => {
    if (isOpen && warehouse) {
      fetchWarehouseStats();
    }
  }, [isOpen, warehouse]);

  const fetchWarehouseStats = async () => {
    if (!warehouse) return;

    try {
      setLoading(true);
      const data = (await get(
        `/api/admin/warehouses/${warehouse.id}/stats`
      )) as WarehouseStats;
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch warehouse stats:", error);
      // Set default stats
      setStats({
        totalProducts: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalOrders: 0,
        pendingShipments: 0,
        utilizationRate: 0,
        topProducts: [],
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          color: "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: "Active",
        };
      case "INACTIVE":
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <Building className="h-3 w-3" />,
          label: "Inactive",
        };
      case "MAINTENANCE":
        return {
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Maintenance",
        };
      case "UNDER_CONSTRUCTION":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: <Building className="h-3 w-3" />,
          label: "Under Construction",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <Building className="h-3 w-3" />,
          label: status,
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case "FULFILLMENT":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          label: "Fulfillment",
        };
      case "STORAGE":
        return {
          color: "bg-purple-100 text-purple-700 border-purple-200",
          label: "Storage",
        };
      case "DISTRIBUTION":
        return {
          color: "bg-orange-100 text-orange-700 border-orange-200",
          label: "Distribution",
        };
      case "CROSS_DOCK":
        return {
          color: "bg-cyan-100 text-cyan-700 border-cyan-200",
          label: "Cross Dock",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          label: type,
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!warehouse) return null;

  const statusInfo = getStatusInfo(warehouse.status);
  const typeInfo = getTypeInfo(warehouse.type);
  const utilizationPercentage =
    warehouse.capacity > 0
      ? Math.round((warehouse.currentStock / warehouse.capacity) * 100)
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border border-gray-600 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                {warehouse.name}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {warehouse.city}, {warehouse.state || warehouse.region}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`${statusInfo.color} border flex items-center gap-1`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
              <Badge className={`${typeInfo.color} border`}>
                {typeInfo.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-600 mb-4">
          {["overview", "products", "activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-[#f8c017] border-b-2 border-[#f8c017]"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-[#2a2a2a] border border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#f8c017]" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-400">Address:</span>
                    <span className="ml-2 text-white">
                      {warehouse.address || "Not provided"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Region:</span>
                    <span className="ml-2 text-white">{warehouse.region}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Zip Code:</span>
                    <span className="ml-2 text-white">
                      {warehouse.zipCode || "N/A"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Country:</span>
                    <span className="ml-2 text-white">
                      {warehouse.country || "Not specified"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#2a2a2a] border border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#f8c017]" />
                    Management Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-400">Manager:</span>
                    <span className="ml-2 text-white">
                      {warehouse.manager || "Unassigned"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Contact Email:</span>
                    <span className="ml-2 text-white">
                      {warehouse.contactEmail || "Not provided"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Contact Phone:</span>
                    <span className="ml-2 text-white flex items-center gap-2">
                      {warehouse.contactPhone || "Not provided"}
                      {warehouse.contactPhone ? (
                        <CallContactAction
                          contactNumber={warehouse.contactPhone}
                          contactName={warehouse.manager || warehouse.name}
                          size="icon-sm"
                        />
                      ) : null}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Created:</span>
                    <span className="ml-2 text-white">
                      {formatDate(warehouse.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Capacity and Utilization */}
            <Card className="bg-[#2a2a2a] border border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#f8c017]" />
                  Capacity & Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {warehouse.capacity.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Total Capacity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {warehouse.currentStock.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Current Stock</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${
                        utilizationPercentage > 90
                          ? "text-red-400"
                          : utilizationPercentage > 75
                          ? "text-[#f8c017]"
                          : "text-emerald-400"
                      }`}
                    >
                      {utilizationPercentage}%
                    </div>
                    <div className="text-sm text-gray-400">Utilization</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Capacity Utilization</span>
                    <span
                      className={`font-medium ${
                        utilizationPercentage > 90
                          ? "text-red-400"
                          : utilizationPercentage > 75
                          ? "text-[#f8c017]"
                          : "text-emerald-400"
                      }`}
                    >
                      {utilizationPercentage}%
                    </span>
                  </div>
                  <Progress value={utilizationPercentage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Statistics Grid */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-[#2a2a2a] border border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">
                          {stats.totalProducts}
                        </div>
                        <div className="text-xs text-gray-400">
                          Total Products
                        </div>
                      </div>
                      <Package className="h-8 w-8 text-[#f8c017]" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a2a2a] border border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">
                          {stats.totalOrders}
                        </div>
                        <div className="text-xs text-gray-400">
                          Total Orders
                        </div>
                      </div>
                      <Truck className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a2a2a] border border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">
                          {stats.lowStockItems}
                        </div>
                        <div className="text-xs text-gray-400">
                          Low Stock Items
                        </div>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#2a2a2a] border border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">
                          {stats.pendingShipments}
                        </div>
                        <div className="text-xs text-gray-400">
                          Pending Shipments
                        </div>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent mx-auto mb-2"></div>
                <p className="text-gray-400">Loading products...</p>
              </div>
            ) : stats?.topProducts?.length ? (
              <div className="space-y-3">
                {stats.topProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="bg-[#2a2a2a] border border-gray-600"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            SKU: {product.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {product.quantity}
                          </div>
                          <div className="text-xs text-gray-400">units</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  No products found in this warehouse
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent mx-auto mb-2"></div>
                <p className="text-gray-400">Loading activity...</p>
              </div>
            ) : stats?.recentActivity?.length ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <Card
                    key={activity.id}
                    className="bg-[#2a2a2a] border border-gray-600"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-white">
                            {activity.description}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(activity.timestamp)}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {activity.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No recent activity found</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:border-gray-500"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={onEdit}
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              Edit Warehouse
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
