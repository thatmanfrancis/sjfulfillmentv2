'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/useUser';
import { get, put, del } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Trash2,
  Package,
  Building,
  MapPin,
  Ruler,
  Warehouse,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface ProductDetails {
  id: string;
  name: string;
  sku: string;
  weightKg: number;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  imageUrl?: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    contactPhone?: string;
  };
  inventory: {
    totalStock: number;
    safetyStock: number;
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      warehouseCode?: string;
      region: string;
      allocatedQuantity: number;
      safetyStock: number;
    }>;
  };
}

interface EditFormData {
  name: string;
  weightKg: number;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  imageUrl?: string;
  stockAllocations: Array<{
    id?: string;
    warehouseId: string;
    allocatedQuantity: number;
    safetyStock: number;
    isNew?: boolean;
  }>;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { user } = useUser();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    weightKg: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0
    },
    imageUrl: '',
    stockAllocations: []
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchWarehouses();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await get(`/api/admin/products/${productId}`) as ProductDetails;
      setProduct(data);
      
      // Initialize edit form with product data including stock allocations
      setEditForm({
        name: data.name,
        weightKg: data.weightKg,
        dimensions: data.dimensions || { length: 0, width: 0, height: 0 },
        imageUrl: data.imageUrl || '',
        stockAllocations: data.inventory.warehouses.map((warehouse) => ({
          id: `${productId}-${warehouse.warehouseId}`, // Create a composite ID
          warehouseId: warehouse.warehouseId,
          allocatedQuantity: warehouse.allocatedQuantity,
          safetyStock: warehouse.safetyStock,
          isNew: false
        }))
      });
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Failed to load product details');
      router.push('/admin/products');
    } finally {
      setLoading(false);
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

  // Inventory management helper functions
  const addStockAllocation = () => {
    setEditForm({
      ...editForm,
      stockAllocations: [
        ...editForm.stockAllocations,
        {
          warehouseId: '',
          allocatedQuantity: 0,
          safetyStock: 0,
          isNew: true
        }
      ]
    });
  };

  const removeStockAllocation = (index: number) => {
    setEditForm({
      ...editForm,
      stockAllocations: editForm.stockAllocations.filter((_, i) => i !== index)
    });
  };

  const updateStockAllocation = (index: number, field: string, value: any) => {
    const updatedAllocations = editForm.stockAllocations.map((allocation, i) => 
      i === index ? { ...allocation, [field]: value } : allocation
    );
    setEditForm({
      ...editForm,
      stockAllocations: updatedAllocations
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (product) {
      setEditForm({
        name: product.name,
        weightKg: product.weightKg,
        dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
        imageUrl: product.imageUrl || '',
        stockAllocations: product.inventory.warehouses.map((warehouse) => ({
          id: `${productId}-${warehouse.warehouseId}`,
          warehouseId: warehouse.warehouseId,
          allocatedQuantity: warehouse.allocatedQuantity,
          safetyStock: warehouse.safetyStock,
          isNew: false
        }))
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Validate total allocated quantity
      const totalAllocated = editForm.stockAllocations.reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0);
      const initialQuantity = Number(editForm.weightKg); // Replace with actual quantity field if present
      if (totalAllocated > initialQuantity) {
        toast.error('Total allocated quantity exceeds product initial quantity');
        setSaving(false);
        return;
      }
      const updateData = {
        name: editForm.name,
        weightKg: editForm.weightKg,
        dimensions: editForm.dimensions,
        ...(editForm.imageUrl && { imageUrl: editForm.imageUrl }),
        stockAllocations: editForm.stockAllocations.filter(allocation => allocation.warehouseId)
      };
      const updatedProduct = await put(`/api/admin/products/${productId}`, updateData) as ProductDetails;
      setProduct(updatedProduct);
      setIsEditing(false);
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await del(`/api/admin/products/${productId}`);
      toast.success('Product deleted successfully');
      router.push('/admin/products');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStockStatus = (totalStock: number, safetyStock: number) => {
    const available = totalStock - safetyStock;
    if (totalStock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-500', icon: AlertTriangle };
    } else if (available <= safetyStock) {
      return { label: 'Low Stock', color: 'bg-orange-500', icon: AlertTriangle };
    } else {
      return { label: 'In Stock', color: 'bg-green-500', icon: CheckCircle2 };
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-black min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center bg-black min-h-screen">
        <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
        <Button onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

    const totalAvailable = product.inventory.totalStock - product.inventory.safetyStock;
  const stockStatus = getStockStatus(totalAvailable, product.inventory.safetyStock);
  const StockIcon = stockStatus.icon;
  const available = product.inventory.totalStock - product.inventory.safetyStock;

  return (
    <div className="p-8 space-y-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/products')}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            <p className="text-gray-400">SKU: {product.sku}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <Button
                onClick={handleEdit}
                className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Product
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Package className="mr-2 h-5 w-5 text-[#f8c017]" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Product Name
                  </label>
                  {isEditing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    />
                  ) : (
                    <p className="text-white">{product.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    SKU
                  </label>
                  <p className="text-white">{product.sku}</p>
                </div>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Image URL (optional)
                  </label>
                  <Input
                    value={editForm.imageUrl || ''}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  />
                </div>
              )}

              {product.imageUrl && !isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Product Image
                  </label>
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dimensions and Weight */}
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Ruler className="mr-2 h-5 w-5 text-[#f8c017]" />
                Physical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Weight (kg)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.weightKg}
                      onChange={(e) => setEditForm({ ...editForm, weightKg: parseFloat(e.target.value) || 0 })}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    />
                  ) : (
                    <p className="text-white">{product.weightKg} kg</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Dimensions (cm)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Length</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.dimensions.length || 0}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          dimensions: { 
                            ...editForm.dimensions, 
                            length: parseFloat(e.target.value) || 0 
                          }
                        })}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      />
                    ) : (
                      <p className="text-white">{product.dimensions?.length || 0}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Width</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.dimensions.width || 0}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          dimensions: { 
                            ...editForm.dimensions, 
                            width: parseFloat(e.target.value) || 0 
                          }
                        })}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      />
                    ) : (
                      <p className="text-white">{product.dimensions?.width || 0}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Height</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.dimensions.height || 0}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          dimensions: { 
                            ...editForm.dimensions, 
                            height: parseFloat(e.target.value) || 0 
                          }
                        })}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      />
                    ) : (
                      <p className="text-white">{product.dimensions?.height || 0}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Business & Inventory */}
        <div className="space-y-6">
          {/* Business Information */}
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Building className="mr-2 h-5 w-5 text-[#f8c017]" />
                Merchant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-white">{product.business.name}</p>
                {product.business.address && (
                  <div className="flex items-start mt-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p>{product.business.address}</p>
                      {(product.business.city || product.business.state) && (
                        <p>
                          {product.business.city}{product.business.city && product.business.state && ', '}{product.business.state}
                        </p>
                      )}
                      {product.business.country && <p>{product.business.country}</p>}
                    </div>
                  </div>
                )}
                {product.business.contactPhone && (
                  <p className="text-sm text-gray-300 mt-2">📞 {product.business.contactPhone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Warehouse className="mr-2 h-5 w-5 text-[#f8c017]" />
                  Inventory Summary
                </div>
                <Badge className={`${stockStatus.color} text-white`}>
                  <StockIcon className="mr-1 h-3 w-3" />
                  {stockStatus.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Total Stock</p>
                  <p className="text-xl font-bold text-white">{product.inventory.totalStock}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Available</p>
                  <p className="text-xl font-bold text-white">{available}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Safety Stock</p>
                  <p className="text-xl font-bold text-white">{product.inventory.safetyStock}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Warehouses</p>
                  <p className="text-xl font-bold text-white">{product.inventory.warehouses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Details */}
          {!isEditing && product.inventory.warehouses.length > 0 && (
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Warehouse className="mr-2 h-5 w-5 text-[#f8c017]" />
                  Warehouse Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.inventory.warehouses.map((warehouse) => {
                    const warehouseAvailable = warehouse.allocatedQuantity - warehouse.safetyStock;
                    return (
                      <div key={warehouse.warehouseId} className="border border-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-white">{warehouse.warehouseName}</h4>
                            {warehouse.warehouseCode && (
                              <p className="text-sm text-gray-400">Code: {warehouse.warehouseCode}</p>
                            )}
                            <p className="text-sm text-gray-400">Region: {warehouse.region}</p>
                          </div>
                          <Badge 
                            variant={warehouseAvailable > warehouse.safetyStock ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {warehouseAvailable} available
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">Allocated</p>
                            <p className="text-white">{warehouse.allocatedQuantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Safety</p>
                            <p className="text-white">{warehouse.safetyStock}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Available</p>
                            <p className="text-white">{warehouseAvailable}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory Management - Edit Mode */}
          {isEditing && (
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <Warehouse className="mr-2 h-5 w-5 text-[#f8c017]" />
                    Inventory Management
                  </div>
                  <Button
                    type="button"
                    onClick={addStockAllocation}
                    className="bg-[#f8c017] text-black hover:bg-[#e6ad15] text-sm px-3 py-1"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Warehouse
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editForm.stockAllocations.length === 0 ? (
                  <div className="text-center py-8">
                    <Warehouse className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No warehouse allocations yet</p>
                    <p className="text-sm text-gray-500">Click "Add Warehouse" to assign stock</p>
                  </div>
                ) : (
                  editForm.stockAllocations.map((allocation, index) => (
                    <div key={`allocation-${index}`} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Warehouse Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Warehouse
                            </label>
                            <select
                              value={allocation.warehouseId}
                              onChange={(e) => updateStockAllocation(index, 'warehouseId', e.target.value)}
                              className="w-full bg-[#1a1a1a] border border-gray-600 text-white rounded-md p-2 focus:border-[#f8c017] focus:ring-[#f8c017] focus:ring-1"
                            >
                              <option value="">Select warehouse...</option>
                              {warehouses.filter(wh => wh.isActive).map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name} ({warehouse.code}) - {warehouse.region}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Allocated Quantity */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Allocated Quantity
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={allocation.allocatedQuantity}
                              onChange={(e) => updateStockAllocation(index, 'allocatedQuantity', parseInt(e.target.value) || 0)}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>

                          {/* Safety Stock */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Safety Stock
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={allocation.safetyStock}
                              onChange={(e) => updateStockAllocation(index, 'safetyStock', parseInt(e.target.value) || 0)}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>
                        </div>

                        {/* Transfer Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/10 mt-7 mr-2"
                          onClick={async () => {
                            // Prompt for destination warehouse and quantity
                            const toWarehouseId = prompt('Enter destination warehouse ID:');
                            const transferQuantity = parseInt(prompt('Enter quantity to transfer:') || '0', 10);
                            if (!toWarehouseId || !transferQuantity || transferQuantity <= 0) {
                              toast.error('Invalid transfer details');
                              return;
                            }
                            // Call backend transfer API
                            try {
                              const res = await fetch('/api/inventory/transfers', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fromWarehouseId: allocation.warehouseId,
                                  toWarehouseId,
                                  productId,
                                  quantity: transferQuantity
                                })
                              });
                              const result = await res.json();
                              if (res.ok && result.success !== false) {
                                toast.success('Stock transferred successfully');
                                fetchProduct();
                              } else {
                                toast.error(result.error || 'Transfer failed');
                              }
                            } catch (err) {
                              toast.error('Transfer failed');
                            }
                          }}
                        >
                          Transfer
                        </Button>

                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeStockAllocation(index)}
                          className="border-red-600 text-red-400 hover:bg-red-600/10 mt-7"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Available Calculation */}
                      <div className="mt-3 p-2 bg-gray-800/50 rounded text-sm">
                        <span className="text-gray-400">Available: </span>
                        <span className="text-white font-medium">
                          {allocation.allocatedQuantity - allocation.safetyStock}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Total Summary */}
                {editForm.stockAllocations.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Allocated: </span>
                        <span className="text-white font-bold">
                          {editForm.stockAllocations.reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Safety: </span>
                        <span className="text-white font-bold">
                          {editForm.stockAllocations.reduce((sum, alloc) => sum + alloc.safetyStock, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Available: </span>
                        <span className="text-white font-bold">
                          {editForm.stockAllocations.reduce((sum, alloc) => sum + (alloc.allocatedQuantity - alloc.safetyStock), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meta Information */}
          <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Eye className="mr-2 h-5 w-5 text-[#f8c017]" />
                Product ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-300 font-mono break-all">{product.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-red-500/20 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-white">Delete Product</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{product.name}"? This action cannot be undone and will remove all associated inventory data.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Product
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}