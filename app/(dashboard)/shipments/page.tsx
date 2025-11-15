'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  Plus,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  User,
  Download,
  RefreshCw
} from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  origin: string;
  destination: string;
  status: string;
  priority: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  carrierId: string;
  carrierName: string;
  totalWeight: number;
  totalCost: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ShipmentStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  cancelled: number;
  totalCost: number;
  averageDeliveryTime: number;
}

interface Carrier {
  id: string;
  name: string;
  activeShipments: number;
  onTimeRate: number;
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchShipments();
    fetchCarriers();
    fetchShipmentStats();
  }, [currentPage, statusFilter, carrierFilter, priorityFilter, searchTerm]);

  const fetchShipments = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(carrierFilter !== 'all' && { carrier: carrierFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/shipments?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCarriers = async () => {
    try {
      const response = await fetch('/api/shipments/carriers', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCarriers(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch carriers:', error);
    }
  };

  const fetchShipmentStats = async () => {
    try {
      const response = await fetch('/api/shipments/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch shipment stats:', error);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });

      if (response.ok) {
        fetchShipments();
        fetchShipmentStats();
      }
    } catch (error) {
      console.error('Failed to update shipment status:', error);
    }
  };

  const refreshTracking = async (shipmentId?: string) => {
    setRefreshing(true);
    try {
      const endpoint = shipmentId 
        ? `/api/shipments/${shipmentId}/refresh-tracking`
        : '/api/shipments/refresh-all-tracking';

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        fetchShipments();
        fetchShipmentStats();
      }
    } catch (error) {
      console.error('Failed to refresh tracking:', error);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    try {
      const response = await fetch('/api/shipments/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: selectedShipments, status }),
        credentials: 'include'
      });

      if (response.ok) {
        setSelectedShipments([]);
        fetchShipments();
        fetchShipmentStats();
      }
    } catch (error) {
      console.error('Failed to bulk update shipments:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'in_transit':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'delayed':
        return 'destructive';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_transit':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'delayed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shipments Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipments Management</h1>
          <p className="text-gray-600 mt-1">
            Track and manage all shipments and deliveries
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => refreshTracking()}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* Shipment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500">Total Shipments</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.inTransit || 0}</div>
              <div className="text-xs text-gray-500">In Transit</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</div>
              <div className="text-xs text-gray-500">Delivered</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats?.delayed || 0}</div>
              <div className="text-xs text-gray-500">Delayed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats?.cancelled || 0}</div>
              <div className="text-xs text-gray-500">Cancelled</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">₦{stats?.totalCost?.toLocaleString() || 0}</div>
              <div className="text-xs text-gray-500">Total Cost</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.averageDeliveryTime || 0}d</div>
              <div className="text-xs text-gray-500">Avg Delivery</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search Shipments</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Tracking number, order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Carrier Filter</Label>
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier.id} value={carrier.id}>
                      {carrier.name} ({carrier.activeShipments})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority Filter</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedShipments.length > 0 && (
        <Card className="border-l-4 border-l-[#f8c017]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{selectedShipments.length} shipments selected</span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => bulkUpdateStatus('in_transit')}>
                  Mark In Transit
                </Button>
                <Button size="sm" onClick={() => bulkUpdateStatus('delivered')}>
                  Mark Delivered
                </Button>
                <Button size="sm" variant="destructive" onClick={() => bulkUpdateStatus('cancelled')}>
                  Cancel Shipments
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedShipments([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>Shipments List</CardTitle>
          <CardDescription>
            Track and manage all shipments with real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedShipments.includes(shipment.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedShipments([...selectedShipments, shipment.id]);
                      } else {
                        setSelectedShipments(selectedShipments.filter(id => id !== shipment.id));
                      }
                    }}
                    className="w-4 h-4 text-[#f8c017] border-gray-300 rounded focus:ring-[#f8c017]"
                  />
                  
                  <div className="w-12 h-12 bg-[#f8c017]/10 rounded-full flex items-center justify-center">
                    {getStatusIcon(shipment.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm">{shipment.trackingNumber}</p>
                      <Badge className={getPriorityColor(shipment.priority)}>
                        {shipment.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{shipment.customerName} • Order #{shipment.orderId}</p>
                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{shipment.origin} → {shipment.destination}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium">{shipment.carrierName}</p>
                    <p className="text-xs text-gray-500">Carrier</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">{shipment.totalWeight}kg</p>
                    <p className="text-xs text-gray-500">Weight</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">₦{shipment.totalCost.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Cost</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <p className="text-sm font-medium">{formatDate(shipment.estimatedDelivery)}</p>
                    </div>
                    <p className="text-xs text-gray-500">Est. Delivery</p>
                  </div>
                  
                  <Badge variant={getStatusBadgeVariant(shipment.status)} className="min-w-20 justify-center">
                    {shipment.status.replace('_', ' ')}
                  </Badge>
                  
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refreshTracking(shipment.id)}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Select onValueChange={(value) => updateShipmentStatus(shipment.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="delayed">Mark Delayed</SelectItem>
                        <SelectItem value="cancelled">Cancel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {shipments.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or create a new shipment.</p>
            </div>
          )}
          
          {shipments.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {shipments.length} shipments
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={shipments.length < 20}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carrier Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Carrier Performance</CardTitle>
          <CardDescription>
            Overview of carrier performance and reliability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {carriers.map((carrier) => (
              <div key={carrier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f8c017]/10 rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4 text-[#f8c017]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{carrier.name}</p>
                    <p className="text-xs text-gray-500">{carrier.activeShipments} active shipments</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{carrier.onTimeRate}%</p>
                  <p className="text-xs text-gray-500">On-time delivery rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}