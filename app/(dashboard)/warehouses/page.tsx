import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Warehouse, MapPin, Package, TrendingUp, MoreHorizontal, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

interface WarehouseData {
  id: string;
  name: string;
  region: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    stockAllocations: number;
  };
}

interface WarehousesData {
  warehouses: WarehouseData[];
  summary: {
    totalWarehouses: number;
    activeWarehouses: number;
    totalRegions: number;
    totalProducts: number;
  };
}

async function getWarehousesData(): Promise<WarehousesData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/warehouses?includeStats=true`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch warehouses data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching warehouses data:', error);
    return {
      warehouses: [],
      summary: {
        totalWarehouses: 0,
        activeWarehouses: 0,
        totalRegions: 0,
        totalProducts: 0,
      },
    };
  }
}

export default async function WarehousesPage() {
  const data = await getWarehousesData();

  // Group warehouses by region
  const warehousesByRegion = data.warehouses.reduce((acc, warehouse) => {
    if (!acc[warehouse.region]) acc[warehouse.region] = [];
    acc[warehouse.region].push(warehouse);
    return acc;
  }, {} as Record<string, WarehouseData[]>);

  return (
    <div className="min-h-screen bg-brand-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-gold">Warehouse Management</h1>
            <p className="text-gray-400">Manage warehouse facilities and inventory locations</p>
          </div>
          <Button className="gradient-gold text-black shadow-gold font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Add New Warehouse
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-gold">Total Warehouses</CardTitle>
              <Warehouse className="h-4 w-4 text-gradient-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-gold">{data.summary.totalWarehouses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active Facilities</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{data.summary.activeWarehouses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Regions</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{data.summary.totalRegions}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Stored Products</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{data.summary.totalProducts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gradient-gold">Filter Warehouses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search warehouses by name or region..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by region" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Regions</SelectItem>
                  {Object.keys(warehousesByRegion).map((region) => (
                    <SelectItem key={region} value={region} className="text-white">
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="active" className="text-white">Active</SelectItem>
                  <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Warehouses by Region */}
        {Object.entries(warehousesByRegion).map(([region, warehouses]) => (
          <Card key={region} className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-gold">
                <MapPin className="h-5 w-5 text-blue-400" />
                {region}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''} in this region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gradient-gold">Warehouse</TableHead>
                      <TableHead className="text-gradient-gold">Status</TableHead>
                      <TableHead className="text-gradient-gold">Products</TableHead>
                      <TableHead className="text-gradient-gold">Stock Allocations</TableHead>
                      <TableHead className="text-gradient-gold">Created</TableHead>
                      <TableHead className="text-gradient-gold">Last Updated</TableHead>
                      <TableHead className="text-gradient-gold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id} className="border-gray-700">
                        <TableCell className="text-white">
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-sm text-gray-400">ID: {warehouse.id.slice(0, 8)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={warehouse.isActive ? "default" : "secondary"}
                            className={warehouse.isActive 
                              ? "bg-green-600 hover:bg-green-600" 
                              : "bg-gray-600 hover:bg-gray-600"
                            }
                          >
                            {warehouse.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-purple-400" />
                            <span>{warehouse._count?.products || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="text-gradient-gold font-medium">
                            {warehouse._count?.stockAllocations || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">
                          {new Date(warehouse.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-300 text-sm">
                          {new Date(warehouse.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-800">
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                              <DropdownMenuLabel className="text-gradient-gold">Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                Manage Inventory
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                Edit Warehouse
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                className={warehouse.isActive 
                                  ? "text-red-400 hover:bg-gray-700" 
                                  : "text-green-400 hover:bg-gray-700"
                                }
                              >
                                {warehouse.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* If no warehouses exist */}
        {data.warehouses.length === 0 && (
          <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Warehouse className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">No warehouses found</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Get started by creating your first warehouse facility.
                </p>
                <Button className="mt-4 bg-gradient-gold hover:bg-gradient-gold/90 text-brand-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Warehouse
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}