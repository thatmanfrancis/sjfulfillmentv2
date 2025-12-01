'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search, Filter, Download, Eye, Package, Plus,
  Building, Calendar, DollarSign, Edit, MoreHorizontal,
  Grid3x3, List, Warehouse, MapPin, Trash2, X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { get, put, del, post } from '@/lib/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExportModal from '@/components/admin/ExportModal';
import AddProductModal from '@/components/admin/AddProductModal';

interface Product {
  id: string;
  name: string;
  sku: string;
  weightKg: number;
  dimensions: any;
  imageUrl?: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
  };
  inventory: {
    totalStock: number;
    safetyStock: number;
    available: number;
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      warehouseCode?: string;
      region: string;
      quantity: number;
      safetyStock: number;
      available: number;
    }>;
  };
}

interface Merchant {
  id: string;
  name: string;
  productCount: number;
  city?: string;
  state?: string;
}

interface ProductStats {
  totalProducts: number;
  activeBusinesses: number;
  totalStock: number;
  lowStockItems: number;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Warehouses data
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Warehouses data

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    weightKg: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0
    },
    imageUrl: '',
    stockAllocations: [] as Array<{
      id?: string;
      warehouseId: string;
      allocatedQuantity: number;
      safetyStock: number;
      isNew?: boolean;
    }>
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Warehouse transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAllocation, setTransferAllocation] = useState<{
    index: number;
    fromWarehouseId: string;
    quantity: number;
  } | null>(null);
  const [transferForm, setTransferForm] = useState({
    toWarehouseId: '',
    transferQuantity: 0,
    notes: ''
  });

  // Bulk move state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveStep, setBulkMoveStep] = useState(1);
  const [bulkMoveWarehouse, setBulkMoveWarehouse] = useState('');
  const [bulkMoveQuantities, setBulkMoveQuantities] = useState<{[id: string]: number}>({});
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [bulkMoveError, setBulkMoveError] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1); // Reset to first page when searching
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [searchTerm, categoryFilter, merchantFilter, page]);

  // Fetch merchants for filtering
  useEffect(() => {
    fetchMerchants();
    fetchWarehouses();
  }, []); const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (merchantFilter) params.append('businessId', merchantFilter);
      params.append('page', page.toString());
      params.append('limit', '20');

      const data = await get(`/api/admin/products?${params}`) as any;
      setProducts(data?.products || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await get('/api/admin/products/stats') as any;
      setStats({
        totalProducts: data?.totalProducts || 0,
        activeBusinesses: data?.activeBusinesses || 0,
        totalStock: data?.totalStock || 0,
        lowStockItems: data?.lowStockItems || 0
      });
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
      setStats({
        totalProducts: 0,
        activeBusinesses: 0,
        totalStock: 0,
        lowStockItems: 0
      });
    }
  };

  const fetchMerchants = async () => {
    try {
      const data = await get('/api/admin/businesses?limit=100') as any;
      const merchantList = data?.businesses?.map((business: any) => ({
        id: business.id,
        name: business.name,
        productCount: business.productCount || 0,
        city: business.city,
        state: business.state
      })) || [];
      setMerchants(merchantList);
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
      setMerchants([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await get('/api/admin/warehouses') as any;
      setWarehouses(data?.warehouses || []);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExport = async (format: string, options: any) => {
    try {
      // TODO: Implement actual export functionality
      console.log('Exporting products:', { format, options });

      // For now, show success message
      toast.success(`Export initiated! Products will be exported as ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Failed to export products:', error);
      toast.error('Failed to export products. Please try again.');
    }
  };

  const handleProductAdded = () => {
    // Refresh products and stats
    fetchProducts();
    fetchStats();
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      weightKg: product.weightKg,
      dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
      imageUrl: product.imageUrl || '',
      stockAllocations: product.inventory?.warehouses?.map(warehouse => ({
        id: `${product.id}-${warehouse.warehouseId}`,
        warehouseId: warehouse.warehouseId,
        allocatedQuantity: warehouse.quantity,
        safetyStock: warehouse.safetyStock,
        isNew: false
      })) || []
    });
    setShowEditModal(true);
  };

  const addStockAllocation = () => {
    setEditForm(prev => ({
      ...prev,
      stockAllocations: [...prev.stockAllocations, {
        warehouseId: '',
        allocatedQuantity: 0,
        safetyStock: 0,
        isNew: true
      }]
    }));
  };

  const removeStockAllocation = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      stockAllocations: prev.stockAllocations.filter((_, i) => i !== index)
    }));
  };

  const updateStockAllocation = (index: number, field: string, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      stockAllocations: prev.stockAllocations.map((allocation, i) =>
        i === index ? { ...allocation, [field]: value } : allocation
      )
    }));
  };

  const initiateWarehouseTransfer = (index: number) => {
    const allocation = editForm.stockAllocations[index];
    setTransferAllocation({
      index,
      fromWarehouseId: allocation.warehouseId,
      quantity: allocation.allocatedQuantity
    });
    setTransferForm({
      toWarehouseId: '',
      transferQuantity: Math.min(allocation.allocatedQuantity, allocation.allocatedQuantity - allocation.safetyStock),
      notes: ''
    });
    setShowTransferModal(true);
  };

  const handleWarehouseTransfer = async () => {
    if (!transferAllocation || !selectedProduct) return;

    try {
      const { index, fromWarehouseId } = transferAllocation;
      const { toWarehouseId, transferQuantity, notes } = transferForm;

      // Make API call to create stock transfer
      const transferPayload = {
        fromWarehouseId,
        toWarehouseId,
        productId: selectedProduct.id,
        quantity: transferQuantity,
        notes: notes || `Product edit transfer: ${selectedProduct.name}`
      };

      const response = await post('/api/inventory/transfers', transferPayload) as any;

      if (!response.success) {
        throw new Error(response.error || 'Failed to create stock transfer');
      }

      // Update local UI state only after successful API call
      const updatedAllocations = [...editForm.stockAllocations];
      updatedAllocations[index].allocatedQuantity -= transferQuantity;

      // Check if target warehouse already has allocation
      const existingTargetIndex = updatedAllocations.findIndex(a => a.warehouseId === toWarehouseId);
      if (existingTargetIndex >= 0) {
        updatedAllocations[existingTargetIndex].allocatedQuantity += transferQuantity;
      } else {
        updatedAllocations.push({
          warehouseId: toWarehouseId,
          allocatedQuantity: transferQuantity,
          safetyStock: 0,
          isNew: true
        });
      }

      // Remove allocation if quantity becomes 0
      const finalAllocations = updatedAllocations.filter(a => a.allocatedQuantity > 0);

      setEditForm(prev => ({
        ...prev,
        stockAllocations: finalAllocations
      }));

      setShowTransferModal(false);
      setTransferAllocation(null);
      toast.success(`Successfully transferred ${transferQuantity} units between warehouses`);
    } catch (error: any) {
      console.error('Transfer failed:', error);
      toast.error(error.message || 'Failed to transfer inventory');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      setIsUpdating(true);

      const updateData = {
        name: editForm.name,
        weightKg: editForm.weightKg,
        dimensions: editForm.dimensions,
        ...(editForm.imageUrl && { imageUrl: editForm.imageUrl }),
        stockAllocations: editForm.stockAllocations.filter(sa =>
          sa.warehouseId && (sa.allocatedQuantity > 0 || sa.safetyStock > 0)
        )
      };

      await put(`/api/admin/products/${selectedProduct.id}`, updateData);

      // Refresh the products list
      fetchProducts();
      setShowEditModal(false);
      setSelectedProduct(null);

      // Show success message
      toast.success('Product updated successfully!');
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      setIsDeleting(true);

      await del(`/api/admin/products/${selectedProduct.id}`);

      // Refresh the products list
      fetchProducts();
      fetchStats();
      setShowDeleteModal(false);
      setSelectedProduct(null);

      // Show success message
      toast.success('Product deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      toast.error(error.message || 'Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Search bar block
  <div className="mb-6 flex items-center justify-between">
    {/* ...search bar and other controls... */}
  </div>

  // Move Products button (top, between search bar and cards)
  {selectedProductIds.length > 0 && (
    <div className="mb-4 flex justify-center w-full">
      <Button
        size="lg"
        className="bg-[#f8c017] text-black px-8 py-3 shadow-lg"
        onClick={() => { setShowBulkMoveModal(true); setBulkMoveStep(1); }}
      >
        Move Products
      </Button>
    </div>
  )}

  if (loading && !products.length) {
    return (
      <div className="space-y-6 bg-black min-h-screen p-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Products Management</h1>
          <p className="text-gray-400 mt-1">Loading products data...</p>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-black border border-[#f8c017]/20">
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
          <h1 className="text-3xl font-bold text-white">Products Management</h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor all products across merchants
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-none ${viewMode === 'grid'
                ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none ${viewMode === 'list'
                ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Products
          </Button>
          <Button
            onClick={() => setShowAddProductModal(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Products
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Products</CardTitle>
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Package className="h-4 w-4 text-[#f8c017]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Businesses</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.activeBusinesses || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Low Stock Items</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.lowStockItems || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Stock</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Warehouse className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalStock || 0}</div>
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
                  placeholder="Search products by name, SKU, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
                {searchInput !== searchTerm && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-[#f8c017] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="books">Books</option>
                <option value="food">Food & Beverages</option>
                <option value="health">Health & Beauty</option>
                <option value="home">Home & Garden</option>
              </select>
            </div>

            {/* Merchant Filter */}
            <div className="min-w-52">
              <select
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              >
                <option value="">All Merchants</option>
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name} ({merchant.productCount} products)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Move Products button (top, between search bar and cards) */}
      {selectedProductIds.length > 0 && (
        <div className="mb-4 flex justify-center w-full">
          <Button
            size="lg"
            className="bg-[#f8c017] text-black px-8 py-3 shadow-lg"
            onClick={() => { setShowBulkMoveModal(true); setBulkMoveStep(1); }}
          >
            Move Products
          </Button>
        </div>
      )}

      {/* Products List */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            console.log(`Product:`, product)
            return (
              <Card key={product.id} className="relative bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all group">
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedProductIds(ids => [...ids, product.id]);
                      } else {
                        setSelectedProductIds(ids => ids.filter(id => id !== product.id));
                      }
                    }}
                    className="form-checkbox h-5 w-5 text-[#f8c017] border-gray-600 rounded focus:ring-[#f8c017]"
                  />
                </div>
                <CardContent className="p-6 space-y-4">
                  {/* Product Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-[#f8c017] transition-colors">
                        {product.name}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                        onClick={() => router.push(`/admin/products/${product.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                        Weight: {product.weightKg}kg
                      </Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">
                        {product.business.city || 'Location N/A'}
                      </Badge>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building className="h-4 w-4 shrink-0" />
                      <span className="truncate">{product.business?.name}</span>
                    </div>
                    {product.sku && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="truncate">SKU: {product.sku}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <Warehouse className="h-4 w-4 shrink-0" />
                      <span className="truncate">Available: {product.inventory.available}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{product.inventory.warehouses.length} warehouse(s)</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      SKU: {product.sku}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017] h-8 px-3"
                        onClick={() => router.push(`/admin/products/${product.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:border-gray-500 h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1a] border border-gray-600">
                          <DropdownMenuItem
                            onClick={() => handleEditProduct(product)}
                            className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-400 hover:bg-red-600/10 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        // List View  
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id} className="relative bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all">
              <div className="absolute top-4 left-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedProductIds(ids => [...ids, product.id]);
                    } else {
                      setSelectedProductIds(ids => ids.filter(id => id !== product.id));
                    }
                  }}
                  className="form-checkbox h-5 w-5 text-[#f8c017] border-gray-600 rounded focus:ring-[#f8c017]"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Product Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-lg hover:text-[#f8c017] transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/products/${product.id}`)}>
                        {product.name}
                      </h3>
                      <Badge className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                        Weight: {product.weightKg}kg
                      </Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-600">
                        {product.business.city || 'Location N/A'}
                      </Badge>
                    </div>

                    {/* Product Details */}
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">Merchant: {product.business?.name}</span>
                      </div>
                      {product.sku && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Package className="h-4 w-4" />
                          <span className="text-sm">SKU: {product.sku}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <Warehouse className="h-4 w-4" />
                        <span className="text-sm">Available: {product.inventory.available}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">Warehouses: {product.inventory.warehouses.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-gray-500"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a1a] border border-gray-600">
                        <DropdownMenuItem
                          onClick={() => handleEditProduct(product)}
                          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-400 hover:bg-red-600/10 hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Product card checkbox (top-left) */}
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedProductIds(ids => [...ids, product.id]);
                      } else {
                        setSelectedProductIds(ids => ids.filter(id => id !== product.id));
                      }
                    }}
                    className="form-checkbox h-5 w-5 text-[#f8c017] border-gray-600 rounded focus:ring-[#f8c017]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No products found</p>
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

      {/* Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        totalProducts={stats?.totalProducts || 0}
      />

      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductAdded={handleProductAdded}
      />

      {/* Edit Product Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[#1a1a1a] border border-gray-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Product</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the product details below.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-gray-300">Product Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight" className="text-gray-300">Weight (kg)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.1"
                    value={editForm.weightKg}
                    onChange={(e) => setEditForm(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Dimensions (cm)</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="edit-length" className="text-xs text-gray-400">Length</Label>
                    <Input
                      id="edit-length"
                      type="number"
                      step="0.1"
                      value={editForm.dimensions.length}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        dimensions: { ...prev.dimensions, length: parseFloat(e.target.value) || 0 }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-width" className="text-xs text-gray-400">Width</Label>
                    <Input
                      id="edit-width"
                      type="number"
                      step="0.1"
                      value={editForm.dimensions.width}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        dimensions: { ...prev.dimensions, width: parseFloat(e.target.value) || 0 }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-height" className="text-xs text-gray-400">Height</Label>
                    <Input
                      id="edit-height"
                      type="number"
                      step="0.1"
                      value={editForm.dimensions.height}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        dimensions: { ...prev.dimensions, height: parseFloat(e.target.value) || 0 }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-image" className="text-gray-300">Image URL (Optional)</Label>
                <Input
                  id="edit-image"
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Inventory Management Section */}
              <div className="space-y-4 border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Inventory Management</Label>
                    <p className="text-xs text-gray-400 mt-1">Manage stock allocations across warehouses</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStockAllocation}
                    className="text-xs border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017]/10"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Warehouse
                  </Button>
                </div>

                {editForm.stockAllocations.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No inventory allocations. Click "Add Warehouse" to assign stock to warehouses.
                  </div>
                )}

                {editForm.stockAllocations.map((allocation, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-[#2a2a2a] rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Warehouse</Label>
                      <Select
                        value={allocation.warehouseId}
                        onValueChange={(value) => updateStockAllocation(index, 'warehouseId', value)}
                      >
                        <SelectTrigger className="w-full h-9 text-sm bg-white border-gray-300 text-black focus:border-[#f8c017] focus:ring-[#f8c017]">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-300">
                          {warehouses.filter(w => w.status === 'ACTIVE').map((warehouse) => (
                            <SelectItem
                              key={warehouse.id}
                              value={warehouse.id}
                              className="text-black hover:bg-gray-100 focus:bg-gray-100 focus:text-black data-highlighted:bg-gray-100 data-highlighted:text-black"
                            >
                              {warehouse.name} ({warehouse.region})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Stock Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={allocation.allocatedQuantity}
                        onChange={(e) => updateStockAllocation(index, 'allocatedQuantity', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm bg-[#1a1a1a] border-gray-600 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Safety Stock</Label>
                      <Input
                        type="number"
                        min="0"
                        value={allocation.safetyStock}
                        onChange={(e) => updateStockAllocation(index, 'safetyStock', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm bg-[#1a1a1a] border-gray-600 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => initiateWarehouseTransfer(index)}
                          className="h-9 flex-1 text-xs border-blue-600 text-blue-400 hover:bg-blue-600/10"
                          title="Transfer to another warehouse"
                        >
                          Transfer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeStockAllocation(index)}
                          className="h-9 flex-1 text-xs border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {editForm.stockAllocations.length > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-600">
                    <div className="text-sm text-gray-300">
                      <strong>Total Stock:</strong> {editForm.stockAllocations.reduce((sum, sa) => sum + sa.allocatedQuantity, 0)} units
                    </div>
                    <div className="text-sm text-gray-300">
                      <strong>Total Safety Stock:</strong> {editForm.stockAllocations.reduce((sum, sa) => sum + sa.safetyStock, 0)} units
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdating}
                  className="border-gray-600 text-gray-300 hover:border-gray-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateProduct}
                  disabled={isUpdating || !editForm.name || editForm.weightKg <= 0}
                  className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                >
                  {isUpdating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border border-black border-t-transparent mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Product'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#1a1a1a] border border-red-600/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the product and remove all associated data.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-600">
                <div className="space-y-2">
                  <p className="text-white font-medium">{selectedProduct.name}</p>
                  <p className="text-gray-400 text-sm">SKU: {selectedProduct.sku}</p>
                  <p className="text-gray-400 text-sm">Business: {selectedProduct.business.name}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="border-gray-600 text-gray-300 hover:border-gray-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warehouse Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-[#1a1a1a] border border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Inventory</DialogTitle>
            <DialogDescription className="text-gray-400">
              Move stock from one warehouse to another
            </DialogDescription>
          </DialogHeader>

          {transferAllocation && (
            <div className="space-y-4">
              <div className="bg-[#2a2a2a] rounded-lg p-3 border border-gray-600">
                <p className="text-sm text-gray-300">
                  <span className="text-white font-medium">From:</span> {warehouses.find(w => w.id === transferAllocation.fromWarehouseId)?.name}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-white font-medium">Available:</span> {transferAllocation.quantity} units
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-300">Transfer To</Label>
                  <Select
                    value={transferForm.toWarehouseId}
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, toWarehouseId: value }))}
                  >
                    <SelectTrigger className="w-full bg-white border-gray-300 text-black focus:border-[#f8c017] focus:ring-[#f8c017]">
                      <SelectValue placeholder="Select destination warehouse" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300">
                      {warehouses
                        .filter(w => w.status === 'ACTIVE' && w.id !== transferAllocation.fromWarehouseId)
                        .map((warehouse) => (
                          <SelectItem
                            key={warehouse.id}
                            value={warehouse.id}
                            className="text-black hover:bg-gray-100 focus:bg-gray-100 focus:text-black data-highlighted:bg-gray-100 data-highlighted:text-black"
                          >
                            {warehouse.name} ({warehouse.region})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Transfer Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={transferAllocation.quantity}
                    value={transferForm.transferQuantity}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, transferQuantity: parseInt(e.target.value) || 0 }))}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Notes (Optional)</Label>
                  <Input
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                    placeholder="Transfer reason..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTransferModal(false)}
                  className="border-gray-600 text-gray-300 hover:border-gray-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWarehouseTransfer}
                  disabled={!transferForm.toWarehouseId || transferForm.transferQuantity <= 0 || transferForm.transferQuantity > transferAllocation.quantity}
                  className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                >
                  Transfer Inventory
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Move Modal (step 1) */}
      <Dialog open={showBulkMoveModal} onOpenChange={setShowBulkMoveModal}>
        <DialogContent className="bg-[#1a1a1a] border border-gray-600 text-white max-w-lg">
          {bulkMoveStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Move Products to Warehouse</DialogTitle>
                <DialogDescription>Select warehouse and quantity for each product.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Label className="text-gray-300">Warehouse</Label>
                <select
                  value={bulkMoveWarehouse}
                  onChange={e => setBulkMoveWarehouse(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.region})</option>
                  ))}
                </select>
                <div className="space-y-2">
                  {selectedProductIds.map(pid => {
                    const product = products.find(p => p.id === pid);
                    return product ? (
                      <div key={pid} className="flex items-center gap-2">
                        <span className="text-gray-300">{product.name}</span>
                        <Input
                          type="number"
                          min={1}
                          max={product.inventory.available}
                          value={bulkMoveQuantities[pid] || ''}
                          onChange={e => setBulkMoveQuantities(q => ({ ...q, [pid]: Number(e.target.value) }))}
                          className="w-24 bg-[#181818] border-gray-600 text-white"
                          placeholder="Qty"
                        />
                        <span className="text-xs text-gray-500">Available: {product.inventory.available}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                {bulkMoveError && <div className="text-red-500 text-sm mt-2">{bulkMoveError}</div>}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowBulkMoveModal(false)} className="border-gray-600 text-gray-300">Cancel</Button>
                  <Button
                    onClick={() => {
                      if (!bulkMoveWarehouse || selectedProductIds.some(pid => !bulkMoveQuantities[pid] || bulkMoveQuantities[pid] < 1)) {
                        setBulkMoveError('Please select warehouse and enter valid quantities for all products.');
                        return;
                      }
                      setBulkMoveError('');
                      setBulkMoveStep(2);
                    }}
                    className="bg-[#f8c017] text-black"
                  >Continue</Button>
                </div>
              </div>
            </>
          )}
          {bulkMoveStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Move</DialogTitle>
                <DialogDescription>Are you sure you want to move these products?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-[#181818] p-4 rounded border border-gray-700">
                  <div className="text-gray-300 mb-2">Warehouse: <span className="font-bold">{warehouses.find(w => w.id === bulkMoveWarehouse)?.name}</span></div>
                  {selectedProductIds.map(pid => {
                    const product = products.find(p => p.id === pid);
                    return product ? (
                      <div key={pid} className="flex items-center justify-between text-sm text-gray-400">
                        <span>{product.name}</span>
                        <span>Qty: {bulkMoveQuantities[pid]}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                {bulkMoveError && <div className="text-red-500 text-sm mt-2">{bulkMoveError}</div>}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowBulkMoveModal(false)} className="border-gray-600 text-gray-300">Cancel</Button>
                  <Button
                    onClick={async () => {
                      setIsBulkMoving(true);
                      setBulkMoveError('');
                      try {
                        // Build moves array for backend
                        const moves = selectedProductIds.map(pid => {
                          const product = products.find(p => p.id === pid);
                          // Find source warehouse for each product (first with available stock)
                          const fromWarehouse = product?.inventory.warehouses.find(w => w.quantity > 0);
                          return {
                            productId: pid,
                            fromWarehouseId: fromWarehouse?.warehouseId,
                            toWarehouseId: bulkMoveWarehouse,
                            quantity: bulkMoveQuantities[pid]
                          };
                        });
                        await post('/api/admin/products/bulk-move', { moves });
                        setShowBulkMoveModal(false);
                        setSelectedProductIds([]);
                        setBulkMoveQuantities({});
                        toast.success('Products moved successfully!');
                        fetchProducts();
                      } catch (err) {
                        setBulkMoveError('Failed to move products. Please try again.');
                      } finally {
                        setIsBulkMoving(false);
                      }
                    }}
                    disabled={isBulkMoving}
                    className="bg-[#f8c017] text-black"
                  >{isBulkMoving ? 'Moving...' : 'Proceed'}</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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