'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  ShoppingBag,
  Download,
  UserPlus,
  MessageSquare,
  Shield
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  tier: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  joinDate: string;
  loyaltyPoints: number;
  preferredPaymentMethod?: string;
  tags: string[];
}

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  newThisMonth: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  retentionRate: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
  }, [currentPage, statusFilter, tierFilter, searchTerm, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
        order: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(tierFilter !== 'all' && { tier: tierFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/customers?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const response = await fetch('/api/admin/customers/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch customer stats:', error);
    }
  };

  const updateCustomerStatus = async (customerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });

      if (response.ok) {
        fetchCustomers();
        fetchCustomerStats();
      }
    } catch (error) {
      console.error('Failed to update customer status:', error);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    try {
      const response = await fetch('/api/admin/customers/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedCustomers, status }),
        credentials: 'include'
      });

      if (response.ok) {
        setSelectedCustomers([]);
        fetchCustomers();
        fetchCustomerStats();
      }
    } catch (error) {
      console.error('Failed to bulk update customers:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8 bg-[#1a1a1a] min-h-screen p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#1a1a1a] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-[#f8c017]" />
            Admin - Customer Management
          </h1>
          <p className="text-gray-400 mt-1">
            Administrative control over customer accounts and relationships
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
              <div className="text-xs text-gray-400">Total Customers</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats?.active || 0}</div>
              <div className="text-xs text-gray-400">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stats?.inactive || 0}</div>
              <div className="text-xs text-gray-400">Inactive</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats?.vip || 0}</div>
              <div className="text-xs text-gray-400">VIP</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats?.newThisMonth || 0}</div>
              <div className="text-xs text-gray-400">New This Month</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <div className="text-xs text-gray-400">Total Revenue</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatCurrency(stats?.averageLifetimeValue || 0)}</div>
              <div className="text-xs text-gray-400">Avg LTV</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats?.retentionRate || 0}%</div>
              <div className="text-xs text-gray-400">Retention</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search" className="text-gray-400">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier Filter</Label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="joinDate">Join Date</SelectItem>
                  <SelectItem value="totalSpent">Total Spent</SelectItem>
                  <SelectItem value="totalOrders">Total Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order</Label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{selectedCustomers.length} customers selected</span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => bulkUpdateStatus('active')}>
                  Activate
                </Button>
                <Button size="sm" variant="destructive" onClick={() => bulkUpdateStatus('suspended')}>
                  Suspend
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCustomers([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Comprehensive customer management and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers([...selectedCustomers, customer.id]);
                      } else {
                        setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                      }
                    }}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm">{customer.name}</p>
                      <Badge variant="outline">{customer.tier}</Badge>
                      <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium">{customer.totalOrders}</p>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-gray-500">Total Spent</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Select onValueChange={(value) => {
                      if (value.startsWith('status:')) {
                        updateCustomerStatus(customer.id, value.replace('status:', ''));
                      }
                    }}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status:active">Activate</SelectItem>
                        <SelectItem value="status:suspended">Suspend</SelectItem>
                        <SelectItem value="status:inactive">Deactivate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
