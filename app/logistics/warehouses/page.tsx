"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MapPin,
  Warehouse,
  Users,
  Package,
  Building,
  Phone,
  Mail,
  Edit,
  Trash2,
  FileText,
  Filter,
} from "lucide-react";
import { get, post } from "@/lib/api";
import CreateWarehouseModal from "@/components/logistics/CreateWarehouseModal";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  region: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  currentStock: number;
  manager?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  assignedStaff: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    inventoryItems: number;
    fulfillmentOrders: number;
    assignedStaff: number;
  };
}

interface ApiResponse {
  success: boolean;
  warehouses: WarehouseData[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
  metadata: {
    totalWarehouses: number;
    userRole: string;
    canCreateWarehouses: boolean;
  };
}

export default function LogisticsWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  const loadWarehouses = async (
    page = 1,
    search = "",
    tabFilter = activeTab
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "12");
      if (search) params.append("search", search);
      if (tabFilter === "assigned") params.append("assignedOnly", "true");

      const data = (await get(
        `/api/logistics/warehouses?${params}`
      )) as ApiResponse;

      if (data?.success) {
        setWarehouses(data.warehouses);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setMetadata(data.metadata);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses(currentPage, searchTerm, activeTab);
  }, [currentPage, activeTab]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadWarehouses(1, searchTerm, activeTab);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    loadWarehouses(1, searchTerm, tab);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "INACTIVE":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "MAINTENANCE":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "FULFILLMENT":
        return "bg-[#f8c017]/20 text-[#f8c017] border-[#f8c017]/30";
      case "STORAGE":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "DISTRIBUTION":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "CROSS_DOCK":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="bg-black p-6 min-h-screen">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Warehouse Management
              </h1>
              <p className="text-gray-300 text-lg">Loading warehouse data...</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#232323] border border-gray-700 rounded-lg p-6 animate-pulse"
              >
                <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
                <div className="h-10 w-24 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-16 bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Warehouse Management
            </h1>
            <p className="text-gray-300 text-lg">
              Manage logistics warehouses and facilities
            </p>
            {metadata && (
              <div className="flex items-center gap-4 mt-3">
                <Badge className="bg-[#f8c017]/20 text-[#f8c017] border-[#f8c017]/30">
                  <Warehouse className="h-4 w-4 mr-1.5" />
                  {metadata.totalWarehouses} Warehouses
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Role: {metadata.userRole}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {metadata?.canCreateWarehouses && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            )}
          </div>
        </div>

        {/* Tabs for filtering warehouses */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#2a2a2a] border-gray-600">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
            >
              All Warehouses
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black text-gray-300"
            >
              My Assigned
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search warehouses by name, region, or code..."
              className="pl-10 bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            Search
          </Button>
          <Button
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Warehouses Grid */}
        {warehouses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <Card
                key={warehouse.id}
                className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg font-semibold">
                      {warehouse.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(warehouse.status)}>
                        {warehouse.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-gray-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {warehouse.city}, {warehouse.region}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warehouse Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Code</span>
                      <span className="text-sm font-mono text-[#f8c017]">
                        {warehouse.code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Type</span>
                      <Badge className={getTypeColor(warehouse.type)}>
                        {warehouse.type.replace("_", " ")}
                      </Badge>
                    </div>
                    {warehouse.capacity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Capacity</span>
                        <span className="text-sm text-white">
                          {warehouse.currentStock.toLocaleString()} /{" "}
                          {warehouse.capacity.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-700">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400">
                        {warehouse._count.inventoryItems}
                      </div>
                      <div className="text-xs text-gray-400">Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">
                        {warehouse._count.fulfillmentOrders}
                      </div>
                      <div className="text-xs text-gray-400">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#f8c017]">
                        {warehouse._count.assignedStaff}
                      </div>
                      <div className="text-xs text-gray-400">Staff</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(warehouse.contactEmail ||
                    warehouse.contactPhone ||
                    warehouse.manager) && (
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                      {warehouse.manager && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            {warehouse.manager}
                          </span>
                        </div>
                      )}
                      {warehouse.contactEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            {warehouse.contactEmail}
                          </span>
                        </div>
                      )}
                      {warehouse.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            {warehouse.contactPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-700 rounded-lg">
            <Warehouse className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Warehouses Found
            </h3>
            <p className="text-gray-400 text-center max-w-md mb-4">
              {searchTerm
                ? `No warehouses match "${searchTerm}". Try adjusting your search.`
                : "No warehouses are currently assigned to you. Create your first warehouse or contact an administrator."}
            </p>
            {metadata?.canCreateWarehouses && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Warehouse
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={page === currentPage ? "default" : "outline"}
                      className={
                        page === currentPage
                          ? "bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                          : "border-gray-600 text-gray-300 hover:bg-gray-800"
                      }
                      size="sm"
                    >
                      {page}
                    </Button>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="text-gray-500 px-2">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Next
            </Button>
          </div>
        )}

        {/* Create Warehouse Modal */}
        <CreateWarehouseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadWarehouses(1, searchTerm); // Reload warehouses after creation
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
