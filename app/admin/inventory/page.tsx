'use client';

import { useEffect, useState } from 'react';
import { get, post, patch } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingDown, TrendingUp, AlertTriangle, MoreHorizontal, Plus, Search, Filter, Edit, Trash2, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { StockTransferModal } from './components/StockTransferModal';
import { BulkActionsModal } from './components/BulkActionsModal';


interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  maxStock: number;
  lastUpdated: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
  };
  warehouse: {
    id: string;
    name: string;
    region: string;
  };
}

interface InventoryData {
  inventory: InventoryItem[];
  summary: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
    totalQuantity: number;
    totalReserved: number;
  };
}

async function getInventoryData(): Promise<InventoryData> {
  try {
    // Admin inventory API endpoint
    const data: any = await get('/api/admin/inventory?includeAllWarehouses=true');
    
    // Transform admin inventory data format
    const inventory = data.inventory?.map((item: any) => ({
      id: `${item.id}-admin`,
      productId: item.productId,
      warehouseId: item.warehouseId || 'admin-warehouse',
      quantity: item.quantity || 0,
      reservedQuantity: item.reservedQuantity || 0,
      availableQuantity: item.availableQuantity || 0,
      reorderPoint: item.reorderPoint || 20,
      maxStock: item.maxStock || 500,
      lastUpdated: item.lastUpdated || new Date().toISOString(),
      product: {
        id: item.product?.id || item.productId,
        name: item.product?.name || 'Unknown Product',
        sku: item.product?.sku || 'Unknown SKU',
        price: item.product?.price || 0,
      },
      warehouse: {
        id: item.warehouse?.id || 'admin-warehouse',
        name: item.warehouse?.name || 'Admin Warehouse',
        region: item.warehouse?.region || 'Global',
      },
    })) || [];

    // Calculate summary stats for admin view
    const lowStockItems = inventory.filter((item: InventoryItem) => item.quantity <= item.reorderPoint).length;
    const outOfStockItems = inventory.filter((item: InventoryItem) => item.quantity === 0).length;
    const totalValue = inventory.reduce((sum: number, item: InventoryItem) => sum + (item.quantity * item.product.price), 0);
    const totalQuantity = inventory.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0);
    const totalReserved = inventory.reduce((sum: number, item: InventoryItem) => sum + item.reservedQuantity, 0);

    return {
      inventory,
      summary: {
        totalItems: inventory.length,
        lowStockItems,
        outOfStockItems,
        totalValue,
        totalQuantity,
        totalReserved,
      },
    };
  } catch (error) {
    console.error('Error fetching admin inventory data:', error);
    return {
      inventory: [],
      summary: {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
        totalQuantity: 0,
        totalReserved: 0,
      },
    };
  }
}

function getStockStatus(item: InventoryItem) {
  if (item.quantity === 0) return { status: 'Out of Stock', color: 'bg-red-600', textColor: 'text-red-400' };
  if (item.quantity <= item.reorderPoint) return { status: 'Low Stock', color: 'bg-yellow-600', textColor: 'text-yellow-400' };
  if (item.quantity >= item.maxStock * 0.9) return { status: 'Overstock', color: 'bg-blue-600', textColor: 'text-blue-400' };
  return { status: 'In Stock', color: 'bg-green-600', textColor: 'text-green-400' };
}

export default function AdminInventoryPage() {
  const [data, setData] = useState<InventoryData>({
    inventory: [],
    summary: {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0,
      totalQuantity: 0,
      totalReserved: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventoryData = await getInventoryData();
        setData(inventoryData);
      } catch (error) {
        console.error('Failed to fetch admin inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-gold flex items-center">
              <Shield className="w-8 h-8 mr-3" />
              Admin - Inventory Management
            </h1>
            <p className="text-gray-400">Administrative control over all inventory across warehouses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <Filter className="w-4 h-4 mr-2" />
              Export All
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-gold text-black shadow-gold font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-brand-black border-brand-black/20 bg-linear-to-br from-brand-black to-white/5 text-white">
                <DialogHeader>
                  <DialogTitle className="text-brand-gold">Add New Inventory Item</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Add a new product to the inventory system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Product Name</Label>
                      <Input placeholder="Enter product name" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-300">SKU</Label>
                      <Input placeholder="Product SKU" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Initial Quantity</Label>
                      <Input type="number" placeholder="0" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Reorder Point</Label>
                      <Input type="number" placeholder="10" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Warehouse</Label>
                    <Select>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="main" className="text-white">Main Warehouse</SelectItem>
                        <SelectItem value="secondary" className="text-white">Secondary Warehouse</SelectItem>
                        <SelectItem value="admin" className="text-white">Admin Warehouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                      Cancel
                    </Button>
                    <Button className="gradient-gold text-black shadow-gold font-semibold">
                      Add Inventory
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Admin Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <BulkActionsModal onActionCompleted={() => window.location.reload()} />
            <StockTransferModal onTransferCreated={() => window.location.reload()} />
            <Button variant="outline" className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white">
              Audit Inventory
            </Button>
          </div>
        </div>

        {/* Admin Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Items</CardTitle>
              <Package className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data.summary.totalItems}</div>
              <p className="text-xs text-gray-400">All inventory items</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Quantity</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.summary.totalQuantity.toLocaleString()}</div>
              <p className="text-xs text-gray-400">Items in stock</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Reserved</CardTitle>
              <Package className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{data.summary.totalReserved.toLocaleString()}</div>
              <p className="text-xs text-gray-400">Reserved items</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{data.summary.lowStockItems}</div>
              <p className="text-xs text-gray-400">Need restocking</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{data.summary.outOfStockItems}</div>
              <p className="text-xs text-gray-400">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-gold">
                ₦{data.summary.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">Inventory worth</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Filters and Search */}
        <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
          <CardHeader>
            <CardTitle className="text-brand-gold">Admin Filter Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by product name, SKU, or warehouse..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Stock status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="in-stock" className="text-white">In Stock</SelectItem>
                  <SelectItem value="low-stock" className="text-white">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock" className="text-white">Out of Stock</SelectItem>
                  <SelectItem value="overstock" className="text-white">Overstock</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Warehouses</SelectItem>
                  <SelectItem value="main" className="text-white">Main Warehouse</SelectItem>
                  <SelectItem value="admin" className="text-white">Admin Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Admin Inventory Table */}
        <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
          <CardHeader>
            <CardTitle className="text-brand-gold">Admin Inventory Overview</CardTitle>
            <CardDescription className="text-gray-400">
              Global inventory management with administrative controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gradient-gold">Product</TableHead>
                    <TableHead className="text-gradient-gold">Warehouse</TableHead>
                    <TableHead className="text-gradient-gold">Stock Status</TableHead>
                    <TableHead className="text-gradient-gold">Quantity</TableHead>
                    <TableHead className="text-gradient-gold">Reserved</TableHead>
                    <TableHead className="text-gradient-gold">Available</TableHead>
                    <TableHead className="text-gradient-gold">Reorder Point</TableHead>
                    <TableHead className="text-gradient-gold">Stock Level</TableHead>
                    <TableHead className="text-gradient-gold">Value</TableHead>
                    <TableHead className="text-gradient-gold">Admin Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const stockPercentage = Math.min((item.quantity / item.maxStock) * 100, 100);
                    
                    return (
                      <TableRow key={item.id} className="border-gray-700">
                        <TableCell className="text-white">
                          <div>
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-sm text-gray-400">SKU: {item.product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div>
                            <div className="font-medium text-sm">{item.warehouse.name}</div>
                            <div className="text-xs text-gray-400">{item.warehouse.region}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className={stockStatus.color}>
                            {stockStatus.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-mono">
                          <span className={stockStatus.textColor}>{item.quantity}</span>
                        </TableCell>
                        <TableCell className="text-yellow-400 font-mono">
                          {item.reservedQuantity}
                        </TableCell>
                        <TableCell className="text-green-400 font-mono">
                          {item.availableQuantity}
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono">
                          {item.reorderPoint}
                        </TableCell>
                        <TableCell className="w-32">
                          <div className="space-y-1">
                            <Progress 
                              value={stockPercentage} 
                              className="h-2 bg-gray-700"
                            />
                            <div className="text-xs text-gray-400">
                              {stockPercentage.toFixed(0)}% of max
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-brand-gold font-medium">
                          ₦{(item.quantity * item.product.price).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                              <DropdownMenuLabel className="text-brand-gold">Admin Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                Force Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                Override Transfer
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                View Full History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem className="text-blue-400 hover:bg-gray-700">
                                Emergency Restock
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400 hover:bg-gray-700">
                                Quarantine Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* If no inventory */}
        {data.inventory.length === 0 && (
          <Card className="border-brand-black/20 bg-gradient-black shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-white">No inventory found</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Start by adding products to warehouses or check your filters.
                </p>
                <Button className="mt-4 gradient-gold text-black shadow-gold font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}