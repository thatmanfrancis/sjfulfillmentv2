'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Package,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Plus,
  Download,
  RefreshCw,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Image,
  Settings,
  Grid3X3,
  List,
  Tag,
  Zap,
  Clock,
  Target,
  Phone,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryChart, SalesChart } from '@/components/dashboard/charts';
import { Product } from '@/types';

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  categories: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchProducts();
    fetchProductStats();
  }, [categoryFilter, statusFilter, timeRange]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        category: categoryFilter !== 'all' ? categoryFilter : '',
        status: statusFilter !== 'all' ? statusFilter : '',
        search: searchTerm
      });

      const response = await fetch(`/api/products?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductStats = async () => {
    try {
      const response = await fetch('/api/products/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'out-of-stock', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle };
    if (quantity < 10) return { status: 'low-stock', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertTriangle };
    return { status: 'in-stock', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 };
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Products Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive product inventory management and sales analytics
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4 mr-2" /> : <Grid3X3 className="w-4 h-4 mr-2" />}
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button className="gradient-gold text-black shadow-gold">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">All inventory items</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Available for sale</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.outOfStock || 0}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₦{stats?.totalValue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.categories || 0}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="catalog" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setTimeRange('7d')} 
                    className={timeRange === '7d' ? 'bg-primary text-primary-foreground' : ''}>
              7D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('30d')} 
                    className={timeRange === '30d' ? 'bg-primary text-primary-foreground' : ''}>
              30D
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('90d')} 
                    className={timeRange === '90d' ? 'bg-primary text-primary-foreground' : ''}>
              90D
            </Button>
          </div>
        </div>

        <TabsContent value="catalog" className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Category: {categoryFilter === 'all' ? 'All' : categoryFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setCategoryFilter('all')}>All Categories</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoryFilter('electronics')}>Electronics</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoryFilter('fashion')}>Fashion</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoryFilter('home')}>Home & Garden</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoryFilter('books')}>Books</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoryFilter('sports')}>Sports</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>Inactive</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('low-stock')}>Low Stock</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('out-of-stock')}>Out of Stock</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Products Display */}
          {viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const stockInfo = getStockStatus(product.quantity || 0);
                const StockIcon = stockInfo.icon;
                
                return (
                  <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardHeader className="pb-2">
                      <div className="aspect-square bg-gradient-to-br from-accent to-muted rounded-lg mb-3 relative overflow-hidden">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className={stockInfo.color}>
                            <StockIcon className="w-3 h-3 mr-1" />
                            {product.quantity || 0}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {product.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-lg font-bold">₦{product.price.toLocaleString()}</span>
                          </div>
                          <Badge variant="secondary">{product.category}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                            <span>{Math.floor(Math.random() * 100)} sold</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{(4 + Math.random()).toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Analytics
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
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
          ) : (
            // List View
            <Card>
              <CardHeader>
                <CardTitle>Products List</CardTitle>
                <CardDescription>Detailed view of all products</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stockInfo = getStockStatus(product.quantity || 0);
                      const StockIcon = stockInfo.icon;

                      return (
                        <TableRow key={product.id} className="hover:bg-accent">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-accent to-muted rounded-lg flex items-center justify-center">
                                {product.images?.[0] ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Image className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {product.description?.slice(0, 50)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">₦{product.price.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={stockInfo.color}>
                              <StockIcon className="w-3 h-3 mr-1" />
                              {product.quantity || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                              <span>{Math.floor(Math.random() * 100)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{(4 + Math.random()).toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  View Analytics
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue distribution by product categories</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart />
              </CardContent>
            </Card>

            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Product sales performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart />
              </CardContent>
            </Card>

            {/* Inventory Health */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Inventory Health Overview</CardTitle>
                <CardDescription>Stock levels and reorder recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Critical Stock Levels</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Premium Headphones', stock: 2, status: 'critical' },
                        { name: 'Wireless Earbuds', stock: 5, status: 'low' },
                        { name: 'Phone Case Set', stock: 8, status: 'low' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.stock} units left</p>
                          </div>
                          <Badge variant="outline" className={
                            item.status === 'critical' ? 'text-red-600 border-red-200' : 'text-yellow-600 border-yellow-200'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Fast Moving Items</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Smart Watch Pro', velocity: '45/week', trend: 'up' },
                        { name: 'Bluetooth Speaker', velocity: '32/week', trend: 'up' },
                        { name: 'Laptop Stand', velocity: '28/week', trend: 'stable' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.velocity}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {item.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary">Reorder Recommendations</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Premium Headphones', recommended: 50, priority: 'high' },
                        { name: 'Wireless Earbuds', recommended: 30, priority: 'medium' },
                        { name: 'Phone Case Set', recommended: 25, priority: 'medium' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Order {item.recommended} units</p>
                          </div>
                          <Badge variant="outline" className={
                            item.priority === 'high' ? 'text-red-600 border-red-200' : 'text-yellow-600 border-yellow-200'
                          }>
                            {item.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Highest revenue generators this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Premium Headphones', revenue: 486000, sales: 245, margin: 35 },
                    { name: 'Smart Watch Pro', revenue: 378000, sales: 189, margin: 28 },
                    { name: 'Wireless Earbuds', revenue: 234000, sales: 156, margin: 42 },
                    { name: 'Laptop Stand', revenue: 201000, sales: 134, margin: 25 },
                    { name: 'Phone Case Set', revenue: 168000, sales: 112, margin: 38 }
                  ].map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 gradient-gold rounded-full flex items-center justify-center shadow-gold text-black font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₦{product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{product.margin}% margin</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key product performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">₦2.8M</div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">34%</div>
                      <div className="text-sm text-muted-foreground">Avg Margin</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">156</div>
                      <div className="text-sm text-muted-foreground">Avg Units Sold/Product</div>
                      <Badge variant="outline" className="mt-1 text-primary border-primary">Good</Badge>
                    </div>
                    
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">18.5 days</div>
                      <div className="text-sm text-muted-foreground">Avg Inventory Turnover</div>
                      <Badge variant="outline" className="mt-1 text-green-600 border-green-200">Excellent</Badge>
                    </div>
                    
                    <div className="text-center p-3 border border-border rounded-lg">
                      <div className="text-lg font-bold text-primary">94.2%</div>
                      <div className="text-sm text-muted-foreground">Stock Availability</div>
                      <Badge variant="outline" className="mt-1 text-primary border-primary">High</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
                <CardDescription>AI-powered business intelligence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-sm">Growing Demand</h4>
                        <p className="text-sm text-muted-foreground">Electronics category showing 23% growth this quarter</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-sm">Stock Alert</h4>
                        <p className="text-sm text-muted-foreground">15 products below reorder threshold</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-start space-x-3">
                      <Star className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-sm">High Performance</h4>
                        <p className="text-sm text-muted-foreground">Premium products maintaining 35%+ margins</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Smart Recommendations</CardTitle>
                <CardDescription>Data-driven action items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Optimize Pricing</h4>
                      <Badge variant="outline" className="text-primary border-primary">High Impact</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Consider 8% price increase for Premium Headphones based on demand</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Bundle Opportunity</h4>
                      <Badge variant="outline" className="text-green-600 border-green-200">Revenue+</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Create phone accessories bundle - 67% purchase correlation</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Inventory Focus</h4>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200">Efficiency</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Reduce slow-moving home category stock by 15%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}