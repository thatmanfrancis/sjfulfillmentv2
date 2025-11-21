'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, TrendingDown } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  lastRestocked: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export default function MerchantInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      // Mock data - replace with actual API call
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          sku: 'SKU-001',
          name: 'Wireless Headphones',
          category: 'Electronics',
          currentStock: 45,
          minimumStock: 10,
          maxStock: 100,
          unitPrice: 79.99,
          totalValue: 3599.55,
          lastRestocked: '2024-01-10',
          status: 'in_stock'
        },
        {
          id: '2',
          sku: 'SKU-002',
          name: 'Phone Case',
          category: 'Accessories',
          currentStock: 8,
          minimumStock: 15,
          maxStock: 50,
          unitPrice: 24.99,
          totalValue: 199.92,
          lastRestocked: '2024-01-05',
          status: 'low_stock'
        },
        {
          id: '3',
          sku: 'SKU-003',
          name: 'USB Cable',
          category: 'Accessories',
          currentStock: 0,
          minimumStock: 20,
          maxStock: 100,
          unitPrice: 12.99,
          totalValue: 0,
          lastRestocked: '2023-12-20',
          status: 'out_of_stock'
        }
      ];
      setInventory(mockInventory);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <Package className="h-4 w-4" />;
      case 'low_stock': return <AlertTriangle className="h-4 w-4" />;
      case 'out_of_stock': return <TrendingDown className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = inventory.filter(item => item.status === 'low_stock').length;
  const outOfStockItems = inventory.filter(item => item.status === 'out_of_stock').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground">
          Track and manage your product inventory levels.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <Button variant="outline">
          Add Product
        </Button>
      </div>

      {/* Inventory List */}
      <div className="space-y-4">
        {filteredInventory.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <Badge className={getStatusColor(item.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                      </div>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.sku} • Category: {item.category}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {item.currentStock} / {item.maxStock} • Min: {item.minimumStock} • Value: ${item.totalValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last restocked: {new Date(item.lastRestocked).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Restock
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No inventory items found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}