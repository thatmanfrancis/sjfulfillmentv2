'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Eye, MapPin, Package, Plus, 
  Edit, Building, Users, Calendar, Truck, CheckCircle, 
  XCircle, AlertCircle, MoreHorizontal
} from 'lucide-react';
import { get } from '@/lib/api';
import AddWarehouseModal from '@/components/admin/AddWarehouseModal';
import WarehouseViewModal from '@/components/admin/WarehouseViewModal';
import WarehouseEditModal from '@/components/admin/WarehouseEditModal';
import WarehouseDeleteModal from '@/components/admin/WarehouseDeleteModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  region: string;
  capacity: number;
  currentStock: number;
  manager?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'UNDER_CONSTRUCTION';
  type: 'FULFILLMENT' | 'STORAGE' | 'DISTRIBUTION' | 'CROSS_DOCK';
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventoryItems: number;
    fulfillmentOrders: number;
  };
}

interface WarehouseStats {
  totalWarehouses: number;
  activeWarehouses: number;
  inactiveWarehouses: number;
  maintenanceWarehouses: number;
  totalCapacity: number;
  totalStock: number;
  utilizationRate: number;
}

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchStats();
  }, [searchTerm, statusFilter, typeFilter, regionFilter, page]);

  const fetchStats = async () => {
    try {
      const data = await get('/api/admin/warehouses/stats') as any;
      setStats({
        totalWarehouses: data?.totalWarehouses || 0,
        activeWarehouses: data?.activeWarehouses || 0,
        inactiveWarehouses: data?.inactiveWarehouses || 0,
        maintenanceWarehouses: data?.maintenanceWarehouses || 0,
        totalCapacity: data?.totalCapacity || 0,
        totalStock: data?.totalStock || 0,
        utilizationRate: data?.utilizationRate || 0
      });
    } catch (error) {
      console.error('Failed to fetch warehouse stats:', error);
      setStats({
        totalWarehouses: 0,
        activeWarehouses: 0,
        inactiveWarehouses: 0,
        maintenanceWarehouses: 0,
        totalCapacity: 0,
        totalStock: 0,
        utilizationRate: 0
      });
    }
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (regionFilter !== 'all') params.append('region', regionFilter);
      params.append('page', page.toString());
      params.append('limit', '12');
      
      const data = await get(`/api/admin/warehouses?${params}`) as any;
      setWarehouses(data?.warehouses || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Active'
        };
      case 'INACTIVE':
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: 'Inactive'
        };
      case 'MAINTENANCE':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Maintenance'
        };
      case 'UNDER_CONSTRUCTION':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Building className="h-3 w-3" />,
          label: 'Under Construction'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <XCircle className="h-3 w-3" />,
          label: status
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'FULFILLMENT':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Fulfillment' };
      case 'STORAGE':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Storage' };
      case 'DISTRIBUTION':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Distribution' };
      case 'CROSS_DOCK':
        return { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Cross Dock' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: type };
    }
  };

  const getCapacityPercentage = (currentStock: number, capacity: number) => {
    return capacity > 0 ? Math.round((currentStock / capacity) * 100) : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowViewModal(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowEditModal(true);
  };

  const handleDeleteWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDeleteModal(true);
  };

  const handleWarehouseUpdated = () => {
    fetchWarehouses();
    fetchStats();
    setShowEditModal(false);
    setSelectedWarehouse(null);
    toast.success('Warehouse updated successfully');
  };

  const handleWarehouseDeleted = () => {
    fetchWarehouses();
    fetchStats();
    setShowDeleteModal(false);
    setSelectedWarehouse(null);
    toast.success('Warehouse deleted successfully');
  };

  const handleWarehouseAdded = () => {
    fetchWarehouses();
    fetchStats();
    toast.success('Warehouse added successfully');
  };

  if (loading && !warehouses.length) {
    return (
      <div className="space-y-6 bg-[#1a1a1a] min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Warehouses Management</h1>
          <p className="text-gray-400 mt-1">Loading warehouse data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Warehouses Management</h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor warehouse facilities across all locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <Download className="h-4 w-4 mr-2" />
            Export Warehouses
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Warehouses</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Building className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalWarehouses || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.activeWarehouses || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Maintenance</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.maintenanceWarehouses || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Capacity</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(stats?.totalCapacity || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Current Stock</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(stats?.totalStock || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Utilization Rate</CardTitle>
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Truck className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.utilizationRate || 0}%</div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-linear-to-r from-[#f8c017] to-[#f8c017]/60 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats?.utilizationRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by warehouse name, location, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
              </div>
            </div>
            <div className="min-w-32">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="UNDER_CONSTRUCTION">Under Construction</option>
              </select>
            </div>
            <div className="min-w-40">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Types</option>
                <option value="FULFILLMENT">Fulfillment</option>
                <option value="STORAGE">Storage</option>
                <option value="DISTRIBUTION">Distribution</option>
                <option value="CROSS_DOCK">Cross Dock</option>
              </select>
            </div>
            <div className="min-w-32">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="all">All Regions</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="central">Central</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((warehouse) => {
          const statusInfo = getStatusInfo(warehouse.status);
          const typeInfo = getTypeInfo(warehouse.type);
          const capacityPercentage = getCapacityPercentage(warehouse.currentStock, warehouse.capacity);
          
          return (
            <Card key={warehouse.id} className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-white">{warehouse.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {warehouse.city}, {warehouse.state}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={`${statusInfo.color} border flex items-center gap-1`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                    <Badge className={`${typeInfo.color} border`}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Manager</span>
                    <span className="text-sm text-white">{warehouse.manager || 'Unassigned'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Stock/Capacity</span>
                    <span className="text-sm text-white">
                      {warehouse.currentStock.toLocaleString()} / {warehouse.capacity.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Region</span>
                    <span className="text-sm text-white capitalize">{warehouse.region}</span>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Utilization</span>
                    <span className={`font-medium ${
                      capacityPercentage > 90 ? 'text-red-400' : 
                      capacityPercentage > 75 ? 'text-[#f8c017]' : 'text-emerald-400'
                    }`}>
                      {capacityPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        capacityPercentage > 90 ? 'bg-red-500' : 
                        capacityPercentage > 75 ? 'bg-[#f8c017]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${capacityPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{warehouse._count?.inventoryItems || 0} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>{warehouse._count?.fulfillmentOrders || 0} orders</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewWarehouse(warehouse)}
                      className="h-8 w-8 p-0 border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      title="View warehouse details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditWarehouse(warehouse)}
                      className="h-8 w-8 p-0 border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      title="Edit warehouse"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 w-8 p-0 border-gray-600 text-gray-300 hover:border-gray-500"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border border-gray-600">
                        <DropdownMenuItem 
                          onClick={() => handleDeleteWarehouse(warehouse)}
                          className="text-red-400 hover:bg-red-600/10 hover:text-red-400 cursor-pointer"
                        >
                          Delete Warehouse
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {warehouses.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No warehouses found</p>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-gray-300">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Warehouse Modal */}
      <AddWarehouseModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onWarehouseAdded={handleWarehouseAdded}
      />

      {/* View Warehouse Modal */}
      <WarehouseViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        warehouse={selectedWarehouse}
        onEdit={() => {
          setShowViewModal(false);
          setShowEditModal(true);
        }}
      />

      {/* Edit Warehouse Modal */}
      <WarehouseEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        warehouse={selectedWarehouse}
        onUpdated={handleWarehouseUpdated}
      />

      {/* Delete Warehouse Modal */}
      <WarehouseDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        warehouse={selectedWarehouse}
        onDeleted={handleWarehouseDeleted}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}