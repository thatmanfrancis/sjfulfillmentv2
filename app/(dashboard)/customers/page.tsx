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
  MessageSquare
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

interface CustomerSegment {
  name: string;
  count: number;
  percentage: number;
  revenue: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
    fetchCustomerSegments();
  }, [currentPage, statusFilter, tierFilter, locationFilter, searchTerm, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
        order: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(tierFilter !== 'all' && { tier: tierFilter }),
        ...(locationFilter !== 'all' && { location: locationFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/customers?${params}`, {
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
      const response = await fetch('/api/customers/stats', {
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

  const fetchCustomerSegments = async () => {
    try {
      const response = await fetch('/api/customers/segments', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSegments(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch customer segments:', error);
    }
  };

  const updateCustomerStatus = async (customerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
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

  const updateCustomerTier = async (customerId: string, newTier: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
        credentials: 'include'
      });

      if (response.ok) {
        fetchCustomers();
        fetchCustomerStats();
      }
    } catch (error) {
      console.error('Failed to update customer tier:', error);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    try {
      const response = await fetch('/api/customers/bulk-update', {
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

  const sendEmail = async (customerId: string, type: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
        credentials: 'include'
      });

      if (response.ok) {
        console.log('Email sent successfully');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'vip':
        return 'default';
      case 'premium':
        return 'secondary';
      case 'gold':
        return 'outline';
      case 'silver':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'vip':
        return 'text-purple-600 bg-purple-50';
      case 'premium':
        return 'text-[#f8c017] bg-yellow-50';
      case 'gold':
        return 'text-yellow-600 bg-yellow-50';
      case 'silver':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
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
      {/* Customers Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">
            Manage customer relationships and analyze customer behavior
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Send Campaign
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500">Total Customers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats?.inactive || 0}</div>
              <div className="text-xs text-gray-500">Inactive</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats?.vip || 0}</div>
              <div className="text-xs text-gray-500">VIP</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.newThisMonth || 0}</div>
              <div className="text-xs text-gray-500">New This Month</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <div className="text-xs text-gray-500">Total Revenue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(stats?.averageLifetimeValue || 0)}</div>
              <div className="text-xs text-gray-500">Avg LTV</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.retentionRate || 0}%</div>
              <div className="text-xs text-gray-500">Retention Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>
            Customer distribution by segments and revenue contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {segments.map((segment, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{segment.name}</h3>
                  <Badge variant="outline">{segment.percentage}%</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{segment.count}</p>
                  <p className="text-sm text-gray-500">customers</p>
                  <p className="text-sm text-[#f8c017] font-medium">{formatCurrency(segment.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name, email, phone..."
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
                  <SelectItem value="bronze">Bronze</SelectItem>
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
                  <SelectItem value="lastOrderDate">Last Order</SelectItem>
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
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <Card className="border-l-4 border-l-[#f8c017]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{selectedCustomers.length} customers selected</span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => bulkUpdateStatus('active')}>
                  Activate
                </Button>
                <Button size="sm" onClick={() => bulkUpdateStatus('inactive')}>
                  Deactivate
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCustomers([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Customers List</CardTitle>
          <CardDescription>
            Manage customer information and analyze customer behavior
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
                    className="w-4 h-4 text-[#f8c017] border-gray-300 rounded focus:ring-[#f8c017]"
                  />
                  
                  <div className="w-12 h-12 bg-[#f8c017]/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#f8c017]" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm">{customer.name}</p>
                      <Badge className={getTierColor(customer.tier)}>
                        {customer.tier}
                      </Badge>
                      {customer.loyaltyPoints > 0 && (
                        <Badge variant="outline" className="text-[#f8c017]">
                          <Star className="w-3 h-3 mr-1" />
                          {customer.loyaltyPoints}
                        </Badge>
                      )}
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
                      {customer.city && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{customer.city}, {customer.state}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                      <span>Joined {formatDate(customer.joinDate)}</span>
                      {customer.lastOrderDate && (
                        <span>Last order {formatDate(customer.lastOrderDate)}</span>
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
                  
                  <div className="text-center">
                    <p className="text-sm font-medium">{formatCurrency(customer.averageOrderValue)}</p>
                    <p className="text-xs text-gray-500">Avg Order</p>
                  </div>
                  
                  <Badge variant={getStatusBadgeVariant(customer.status)} className="min-w-20 justify-center">
                    {customer.status}
                  </Badge>
                  
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendEmail(customer.id, 'welcome')}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendEmail(customer.id, 'marketing')}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Select onValueChange={(value) => {
                      if (value.startsWith('status:')) {
                        updateCustomerStatus(customer.id, value.replace('status:', ''));
                      } else if (value.startsWith('tier:')) {
                        updateCustomerTier(customer.id, value.replace('tier:', ''));
                      }
                    }}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status:active">Activate</SelectItem>
                        <SelectItem value="status:inactive">Deactivate</SelectItem>
                        <SelectItem value="status:suspended">Suspend</SelectItem>
                        <SelectItem value="tier:vip">Make VIP</SelectItem>
                        <SelectItem value="tier:premium">Make Premium</SelectItem>
                        <SelectItem value="tier:gold">Make Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {customers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or add a new customer.</p>
            </div>
          )}
          
          {customers.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {customers.length} customers
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
                  disabled={customers.length < 20}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}