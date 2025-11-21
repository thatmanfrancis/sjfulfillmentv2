'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, Upload, Search, Package, 
  Building2, AlertCircle, CheckCircle2,
  Grid3x3, List, Download
} from 'lucide-react';
import { get, post } from '@/lib/api';
import { toast } from 'react-toastify';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

interface Business {
  id: string;
  name: string;
  city?: string;
  state?: string;
  isActive: boolean;
  productCount: number;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  region: string;
  status: string;
}

interface StockAllocation {
  warehouseId: string;
  allocatedQuantity: number;
  safetyStock: number;
}

export default function AddProductModal({ isOpen, onClose, onProductAdded }: AddProductModalProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const [merchantViewMode, setMerchantViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  
  // Single product form
  const [singleProduct, setSingleProduct] = useState({
    name: '',
    sku: '',
    weightKg: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    }
  });

  // Stock allocation form
  const [stockAllocations, setStockAllocations] = useState<StockAllocation[]>([]);
  const [showStockForm, setShowStockForm] = useState(false);
  const [quickInventoryMode, setQuickInventoryMode] = useState(false);
  const [quickQuantity, setQuickQuantity] = useState('');
  const [selectedWarehouseForQuick, setSelectedWarehouseForQuick] = useState('');

  // Bulk upload
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchBusinesses();
      fetchWarehouses();
    }
  }, [isOpen]);

  const fetchBusinesses = async () => {
    try {
      setIsLoadingBusinesses(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '20');
      
      const data = await get(`/api/admin/businesses?${params}`) as any;
      setBusinesses(data?.businesses || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses([]);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      setIsLoadingWarehouses(true);
      const data = await get('/api/admin/warehouses') as any;
      setWarehouses(data?.warehouses || []);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBusinesses();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBusinessSelect = (business: Business) => {
    if (!business.isActive) return;
    setSelectedBusiness(business);
  };

  const addStockAllocation = () => {
    setStockAllocations([...stockAllocations, { 
      warehouseId: '', 
      allocatedQuantity: 0, 
      safetyStock: 0 
    }]);
  };

  const removeStockAllocation = (index: number) => {
    setStockAllocations(stockAllocations.filter((_, i) => i !== index));
  };

  const updateStockAllocation = (index: number, field: keyof StockAllocation, value: string | number) => {
    const updated = [...stockAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setStockAllocations(updated);
  };

  const handleSingleProductSubmit = async () => {
    if (!selectedBusiness) {
      toast.error('Please select a merchant first');
      return;
    }

    if (!singleProduct.name || !singleProduct.weightKg) {
      toast.error('Please fill in all required fields (Product Name and Weight)');
      return;
    }

    try {
      setIsCreatingProduct(true);
      
      // Validate weight is a valid number
      const weight = parseFloat(singleProduct.weightKg);
      if (isNaN(weight) || weight <= 0) {
        toast.error('Please enter a valid weight (must be greater than 0)');
        return;
      }

      // Build dimensions object only if values are provided
      const dimensions: any = {};
      if (singleProduct.dimensions.length && !isNaN(parseFloat(singleProduct.dimensions.length))) {
        dimensions.length = parseFloat(singleProduct.dimensions.length);
      }
      if (singleProduct.dimensions.width && !isNaN(parseFloat(singleProduct.dimensions.width))) {
        dimensions.width = parseFloat(singleProduct.dimensions.width);
      }
      if (singleProduct.dimensions.height && !isNaN(parseFloat(singleProduct.dimensions.height))) {
        dimensions.height = parseFloat(singleProduct.dimensions.height);
      }

      // Validate stock allocations if any
      const validStockAllocations = stockAllocations.filter(sa => 
        sa.warehouseId && (sa.allocatedQuantity > 0 || sa.safetyStock > 0)
      );

      // Check for duplicate warehouse allocations
      const warehouseIds = validStockAllocations.map(sa => sa.warehouseId);
      if (new Set(warehouseIds).size !== warehouseIds.length) {
        toast.error('Cannot have multiple allocations for the same warehouse');
        return;
      }

      const productData = {
        name: singleProduct.name.trim(),
        businessId: selectedBusiness.id,
        weightKg: weight,
        ...(singleProduct.sku.trim() ? { sku: singleProduct.sku.trim() } : {}), // Only include SKU if provided
        ...(Object.keys(dimensions).length > 0 ? { dimensions } : {}),
        ...(validStockAllocations.length > 0 ? { stockAllocations: validStockAllocations } : {})
      };

      console.log('📦 Sending product data:', productData);

      const result = await post('/api/admin/products', productData) as any;
      
      if (result.success) {
        if (validStockAllocations.length > 0) {
          toast.success('Product created with initial inventory successfully!');
        } else {
          toast.warning('Product created successfully! Remember to assign inventory quantities in the edit modal.');
        }
        onProductAdded();
        
        // Reset form
        setSingleProduct({
          name: '',
          sku: '',
          weightKg: '',
          dimensions: {
            length: '',
            width: '',
            height: '',
          }
        });
        setStockAllocations([]);
        setShowStockForm(false);
        setSelectedBusiness(null);
        onClose();
      } else {
        const errorMessage = result.message || result.error || 'Failed to create product';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('🔥 Failed to create product:', error);
      const errorMessage = error.message || 'Failed to create product. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedBusiness || !bulkFile) {
      toast.error('Please select a merchant and upload a file');
      return;
    }

    try {
      setIsCreatingProduct(true);
      
      // Parse the entire CSV file
      const text = await bulkFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const products = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const product: any = {};
        
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            product[header] = values[index];
          }
        });
        
        // Validate and prepare product data
        if (product.name && product.weightKg) {
          const weight = parseFloat(product.weightKg);
          if (isNaN(weight) || weight <= 0) {
            errors.push(`Row ${i + 1}: Invalid weight value`);
            continue;
          }
          
          const dimensions: any = {};
          if (product.length && !isNaN(parseFloat(product.length))) {
            dimensions.length = parseFloat(product.length);
          }
          if (product.width && !isNaN(parseFloat(product.width))) {
            dimensions.width = parseFloat(product.width);
          }
          if (product.height && !isNaN(parseFloat(product.height))) {
            dimensions.height = parseFloat(product.height);
          }
          
          const productData: any = {
            name: product.name.trim(),
            businessId: selectedBusiness.id,
            weightKg: weight,
            ...(Object.keys(dimensions).length > 0 ? { dimensions } : {})
          };
          
          // Only include SKU if provided
          if (product.sku && product.sku.trim()) {
            productData.sku = product.sku.trim();
          }
          
          // Handle quantity and warehouse allocation if quantity is provided
          if (product.quantity) {
            const quantity = parseInt(product.quantity);
            if (!isNaN(quantity) && quantity > 0) {
              let warehouseId = null;
              
              // First, try to find the specified warehouse
              if (product.warehouseCode) {
                const warehouseCode = product.warehouseCode;
                
                // Find warehouse by code or name (case insensitive)
                const warehouse = warehouses.find(w => 
                  (w.code && w.code.toLowerCase() === warehouseCode.toLowerCase()) ||
                  w.name.toLowerCase() === warehouseCode.toLowerCase() ||
                  w.name.toLowerCase().includes(warehouseCode.toLowerCase())
                );
                
                if (warehouse && warehouse.status === 'ACTIVE') {
                  warehouseId = warehouse.id;
                }
              }
              
              // If no warehouse found or no warehouse code specified, use/create default
              if (!warehouseId) {
                // Look for existing default warehouse
                let defaultWarehouse = warehouses.find(w => 
                  w.name.toLowerCase() === 'default' && w.status === 'ACTIVE'
                );
                
                if (defaultWarehouse) {
                  warehouseId = defaultWarehouse.id;
                } else {
                  // We'll handle default warehouse creation in the backend
                  // For now, mark it for default assignment
                  warehouseId = 'DEFAULT_WAREHOUSE';
                }
              }
              
              productData.stockAllocations = [{
                warehouseId: warehouseId,
                allocatedQuantity: quantity,
                safetyStock: Math.floor(quantity * 0.1) // 10% safety stock
              }];
              
            } else if (product.quantity !== '' && product.quantity !== undefined) {
              errors.push(`Row ${i + 1}: Invalid quantity value '${product.quantity}'`);
              continue;
            }
          }
          
          products.push(productData);
        } else {
          errors.push(`Row ${i + 1}: Missing required fields (name or weightKg)`);
        }
      }
      
      if (errors.length > 0) {
        toast.error(`Found ${errors.length} errors. First error: ${errors[0]}`);
        console.error('Bulk upload errors:', errors);
        return;
      }
      
      if (products.length === 0) {
        toast.error('No valid products found in the CSV file');
        return;
      }
      
      // Upload products one by one
      let successful = 0;
      let failed = 0;
      
      for (const productData of products) {
        try {
          const result = await post('/api/admin/products', productData) as any;
          if (result.success) {
            successful++;
          } else {
            failed++;
            console.error(`Failed to create product:`, result.error);
          }
        } catch (error) {
          failed++;
          console.error(`Error creating product:`, error);
        }
      }
      
      if (successful > 0) {
        const productsWithInventory = products.filter(p => p.stockAllocations && p.stockAllocations.length > 0).length;
        const productsWithoutInventory = successful - productsWithInventory;
        
        if (productsWithoutInventory > 0) {
          toast.success(`Successfully created ${successful} product(s). ${productsWithoutInventory} product(s) were assigned to Default warehouse.`);
        } else {
          toast.success(`Successfully created ${successful} product(s) with assigned warehouses.`);
        }
        onProductAdded();
      }
      
      if (failed > 0) {
        toast.warning(`${failed} products failed to create. Check console for details.`);
      }
      
      // Reset and close
      setBulkFile(null);
      setBulkPreview([]);
      if (failed === 0) {
        onClose();
      }
      
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to process bulk upload. Please try again.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBulkFile(file);
      
      // Parse CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('CSV file must have a header row and at least one data row');
          setBulkFile(null);
          setBulkPreview([]);
          return;
        }
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders = ['name', 'weightKg']; // Remove SKU from required headers
        const optionalHeaders = ['sku', 'length', 'width', 'height', 'quantity', 'warehouseCode'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          setBulkFile(null);
          setBulkPreview([]);
          return;
        }
        
        // Parse data rows
        const products = [];
        for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const product: any = {};
          
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              product[header] = values[index];
            }
          });
          
          // Validate required fields
          if (product.name && product.weightKg) { // Remove SKU requirement
            products.push({
              name: product.name,
              sku: product.sku || '', // SKU is optional
              weight: product.weightKg,
              length: product.length || '',
              width: product.width || '',
              height: product.height || '',
              quantity: product.quantity || '',
              warehouseCode: product.warehouseCode || '',
              description: product.description || ''
            });
          }
        }
        
        setBulkPreview(products);
        
        if (products.length === 0) {
          toast.error('No valid products found in the CSV file');
          setBulkFile(null);
        } else {
          toast.success(`Found ${products.length} valid products in preview`);
        }
      };
      
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-[#f8c017]" />
            Add Products
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add products individually or upload in bulk. First select a merchant to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">
              Select Merchant <span className="text-red-400">*</span>
            </Label>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-gray-600 rounded-lg bg-[#2a2a2a]">
                  <Button
                    variant={merchantViewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMerchantViewMode('grid')}
                    className={`rounded-none h-8 ${merchantViewMode === 'grid' 
                      ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Grid3x3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={merchantViewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMerchantViewMode('list')}
                    className={`rounded-none h-8 ${merchantViewMode === 'list' 
                      ? 'bg-[#f8c017] text-black hover:bg-[#f8c017]/90' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <List className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {selectedBusiness ? (
                <div className="flex items-center justify-between p-3 bg-[#f8c017]/10 border border-[#f8c017]/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-[#f8c017]" />
                    <div>
                      <div className="font-medium text-white">{selectedBusiness.name}</div>
                      <div className="text-xs text-gray-400">
                        {selectedBusiness.city}, {selectedBusiness.state} • {selectedBusiness.productCount} products
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBusiness(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="max-h-60 overflow-auto border border-gray-600 rounded-lg">
                  {isLoadingBusinesses ? (
                    <div className="p-4 text-center text-gray-400">Loading merchants...</div>
                  ) : filteredBusinesses.length > 0 ? (
                    merchantViewMode === 'grid' ? (
                      // Grid View
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                        {filteredBusinesses.map((business) => (
                          <div
                            key={business.id}
                            onClick={() => handleBusinessSelect(business)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${
                              business.isActive
                                ? 'hover:bg-gray-700 border-transparent hover:border-[#f8c017]/30 hover:shadow-sm'
                                : 'opacity-50 cursor-not-allowed border-gray-700'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-gray-400" />
                                  <div className="font-medium text-white text-sm truncate">
                                    {business.name}
                                  </div>
                                </div>
                                {business.isActive ? (
                                  <Badge className="bg-green-500/10 text-green-400 text-xs">Active</Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-400 text-xs">Inactive</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {business.city}, {business.state} • {business.productCount} products
                              </div>
                              {business.isActive && (
                                <div className="flex justify-end">
                                  <CheckCircle2 className="h-4 w-4 text-[#f8c017]" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // List View
                      <div className="space-y-1 p-2">
                        {filteredBusinesses.map((business) => (
                          <div
                            key={business.id}
                            onClick={() => handleBusinessSelect(business)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              business.isActive
                                ? 'hover:bg-gray-700 border border-transparent hover:border-[#f8c017]/30'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="font-medium text-white flex items-center gap-2">
                                    {business.name}
                                    {business.isActive ? (
                                      <Badge className="bg-green-500/10 text-green-400 text-xs">Active</Badge>
                                    ) : (
                                      <Badge className="bg-red-500/10 text-red-400 text-xs">Inactive</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {business.city}, {business.state} • {business.productCount} products
                                  </div>
                                </div>
                              </div>
                              {business.isActive && (
                                <CheckCircle2 className="h-4 w-4 text-[#f8c017]" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      No merchants found. Try adjusting your search.
                    </div>
                  )}
                </div>
              )}
            </div>

            {!selectedBusiness && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                You must select a merchant before adding products
              </div>
            )}
          </div>

          {/* Tabs for Single/Bulk Upload */}
          {selectedBusiness && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a]">
                <TabsTrigger value="single" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  <Package className="h-4 w-4 mr-2" />
                  Single Product
                </TabsTrigger>
                <TabsTrigger value="bulk" className="text-gray-300 data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Product Name *</Label>
                    <Input
                      placeholder="Enter product name"
                      value={singleProduct.name}
                      onChange={(e) => setSingleProduct(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">SKU (Optional)</Label>
                    <Input
                      placeholder="Leave empty for auto-generation (e.g., SKU-NE_01)"
                      value={singleProduct.sku}
                      onChange={(e) => setSingleProduct(prev => ({ ...prev, sku: e.target.value }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-400">
                      If left empty, SKU will be auto-generated as: SKU-{singleProduct.name.length > 0 ? `${singleProduct.name.charAt(0).toUpperCase()}${singleProduct.name.charAt(singleProduct.name.length - 1).toUpperCase()}_01` : 'XX_01'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Weight (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={singleProduct.weightKg}
                      onChange={(e) => setSingleProduct(prev => ({ ...prev, weightKg: e.target.value }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Length (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={singleProduct.dimensions.length}
                      onChange={(e) => setSingleProduct(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, length: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Width (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={singleProduct.dimensions.width}
                      onChange={(e) => setSingleProduct(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, width: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Height (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={singleProduct.dimensions.height}
                      onChange={(e) => setSingleProduct(prev => ({ 
                        ...prev, 
                        dimensions: { ...prev.dimensions, height: e.target.value }
                      }))}
                      className="bg-[#2a2a2a] border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Initial Inventory Section */}
                <div className="space-y-4 border-t border-gray-600 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-300">Initial Inventory</Label>
                      <p className="text-xs text-gray-400 mt-1">Set initial stock quantities for warehouses</p>
                      <p className="text-xs text-amber-400 mt-1">💡 Products without warehouse assignment will use Default warehouse if quantity is specified</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuickInventoryMode(!quickInventoryMode);
                          setShowStockForm(false);
                        }}
                        className={`text-xs border-[#f8c017] hover:bg-[#f8c017]/10 ${
                          quickInventoryMode ? 'bg-[#f8c017] text-black' : 'text-[#f8c017]'
                        }`}
                      >
                        Quick Setup
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowStockForm(!showStockForm);
                          setQuickInventoryMode(false);
                        }}
                        className={`text-xs border-[#f8c017] hover:bg-[#f8c017]/10 ${
                          showStockForm ? 'bg-[#f8c017] text-black' : 'text-[#f8c017]'
                        }`}
                      >
                        Advanced Setup
                      </Button>
                    </div>
                  </div>

                  {/* Quick Inventory Setup */}
                  {quickInventoryMode && (
                    <Card className="bg-[#2a2a2a] border-gray-600">
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-300">Total Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              value={quickQuantity}
                              onChange={(e) => setQuickQuantity(e.target.value)}
                              className="bg-[#1a1a1a] border-gray-600 text-white"
                              placeholder="Enter quantity (e.g., 100)"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-300">Warehouse</Label>
                            <select
                              value={selectedWarehouseForQuick}
                              onChange={(e) => setSelectedWarehouseForQuick(e.target.value)}
                              className="w-full h-10 px-3 text-sm border border-gray-600 rounded-md bg-[#1a1a1a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            >
                              <option value="">Select warehouse</option>
                              {warehouses.filter(w => w.status === 'ACTIVE').map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name} ({warehouse.region})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (quickQuantity && selectedWarehouseForQuick) {
                                const quantity = parseInt(quickQuantity);
                                const existingIndex = stockAllocations.findIndex(sa => sa.warehouseId === selectedWarehouseForQuick);
                                
                                if (existingIndex >= 0) {
                                  // Update existing allocation
                                  const updated = [...stockAllocations];
                                  updated[existingIndex] = {
                                    ...updated[existingIndex],
                                    allocatedQuantity: quantity,
                                    safetyStock: Math.floor(quantity * 0.1) // 10% as safety stock
                                  };
                                  setStockAllocations(updated);
                                } else {
                                  // Add new allocation
                                  setStockAllocations([...stockAllocations, {
                                    warehouseId: selectedWarehouseForQuick,
                                    allocatedQuantity: quantity,
                                    safetyStock: Math.floor(quantity * 0.1) // 10% as safety stock
                                  }]);
                                }
                                
                                // Reset quick form
                                setQuickQuantity('');
                                setSelectedWarehouseForQuick('');
                                
                                toast.success('Inventory allocated successfully!');
                              }
                            }}
                            disabled={!quickQuantity || !selectedWarehouseForQuick || parseInt(quickQuantity) <= 0}
                            className="text-xs border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                          >
                            Allocate Stock
                          </Button>
                        </div>
                        
                        {stockAllocations.length > 0 && (
                          <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-600">
                            <h5 className="text-sm font-medium text-white mb-2">Current Allocations:</h5>
                            <div className="space-y-1">
                              {stockAllocations.map((allocation, index) => {
                                const warehouse = warehouses.find(w => w.id === allocation.warehouseId);
                                return (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300">
                                      {warehouse?.name}: <span className="text-white font-medium">{allocation.allocatedQuantity} units</span>
                                      {allocation.safetyStock > 0 && (
                                        <span className="text-gray-400"> (Safety: {allocation.safetyStock})</span>
                                      )}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeStockAllocation(index)}
                                      className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-sm text-[#f8c017] mt-2 pt-2 border-t border-gray-600">
                              <strong>Total Stock: {stockAllocations.reduce((sum, sa) => sum + sa.allocatedQuantity, 0)} units</strong>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {showStockForm && (
                    <Card className="bg-[#2a2a2a] border-gray-600">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-white">Warehouse Allocations</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addStockAllocation}
                            disabled={isLoadingWarehouses || warehouses.length === 0}
                            className="text-xs border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Warehouse
                          </Button>
                        </div>

                        {isLoadingWarehouses && (
                          <div className="text-center py-4 text-gray-400">
                            Loading warehouses...
                          </div>
                        )}

                        {!isLoadingWarehouses && warehouses.length === 0 && (
                          <div className="text-center py-4 text-gray-400">
                            No warehouses available
                          </div>
                        )}

                        {stockAllocations.length === 0 && !isLoadingWarehouses && warehouses.length > 0 && (
                          <div className="text-center py-4 text-gray-400">
                            No warehouse allocations added. Click "Add Warehouse" to assign initial inventory.
                          </div>
                        )}

                        {stockAllocations.map((allocation, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-400">Warehouse</Label>
                              <select
                                value={allocation.warehouseId}
                                onChange={(e) => updateStockAllocation(index, 'warehouseId', e.target.value)}
                                className="w-full h-9 px-3 text-sm border border-gray-600 rounded-md bg-[#2a2a2a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                              >
                                <option value="">Select warehouse</option>
                                {warehouses.filter(w => w.status === 'ACTIVE').map((warehouse) => (
                                  <option key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name} ({warehouse.region})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-400">Initial Stock</Label>
                              <Input
                                type="number"
                                min="0"
                                value={allocation.allocatedQuantity}
                                onChange={(e) => updateStockAllocation(index, 'allocatedQuantity', parseInt(e.target.value) || 0)}
                                className="h-9 text-sm bg-[#2a2a2a] border-gray-600 text-white"
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
                                className="h-9 text-sm bg-[#2a2a2a] border-gray-600 text-white"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeStockAllocation(index)}
                                className="h-9 w-full text-xs border-red-600 text-red-400 hover:bg-red-600/10"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}

                        {stockAllocations.length > 0 && (
                          <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-600">
                            <div className="text-sm text-gray-300">
                              <strong>Total Initial Stock:</strong> {stockAllocations.reduce((sum, sa) => sum + sa.allocatedQuantity, 0)} units
                            </div>
                            <div className="text-sm text-gray-300">
                              <strong>Total Safety Stock:</strong> {stockAllocations.reduce((sum, sa) => sum + sa.safetyStock, 0)} units
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-gray-600 text-gray-300 hover:border-gray-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSingleProductSubmit}
                    disabled={!singleProduct.name || !singleProduct.weightKg || isCreatingProduct}
                    className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90 disabled:opacity-50"
                  >
                    {isCreatingProduct ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border border-black border-t-transparent mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Add Product'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {/* Template Download */}
                  <Card className="bg-[#2a2a2a] border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">Download Template</h3>
                          <p className="text-gray-400 text-sm">
                            Download the CSV template with sample data to ensure proper formatting
                          </p>
                          <p className="text-xs text-[#f8c017] mt-1">
                            Products with quantities will be assigned to specified warehouse or automatically to "Default" warehouse if not found
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = '/templates/product-bulk-upload-template.csv';
                            link.download = 'product-bulk-upload-template.csv';
                            link.click();
                          }}
                          className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017]/10"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* File Upload Area */}
                  <div className="border border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <Label htmlFor="bulk-upload" className="text-lg font-medium text-white cursor-pointer">
                        Upload CSV File
                      </Label>
                      <p className="text-sm text-gray-400">
                        Drag and drop your file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: CSV (.csv)
                      </p>
                      <Input
                        id="bulk-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {bulkFile && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#f8c017]/10 border border-[#f8c017]/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#f8c017]" />
                          <span className="text-white">{bulkFile.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBulkFile(null);
                            setBulkPreview([]);
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          Remove
                        </Button>
                      </div>

                      {bulkPreview.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">Preview ({bulkPreview.length} products)</Label>
                          <div className="border border-gray-600 rounded-lg overflow-hidden">
                            <div className="bg-[#2a2a2a] p-3 border-b border-gray-600">
                              <div className="grid grid-cols-6 gap-3 text-sm font-medium text-gray-300">
                                <div>Product Name</div>
                                <div>SKU</div>
                                <div>Weight (kg)</div>
                                <div>Dimensions</div>
                                <div>Quantity</div>
                                <div>Warehouse</div>
                              </div>
                            </div>
                            <div className="max-h-40 overflow-auto">
                              {bulkPreview.map((product, index) => (
                                <div key={index} className="p-3 border-b border-gray-700 last:border-b-0">
                                  <div className="grid grid-cols-6 gap-3 text-sm text-white">
                                    <div className="truncate">{product.name}</div>
                                    <div className="text-xs">{product.sku || 'Auto'}</div>
                                    <div>{product.weight}</div>
                                    <div className="text-xs text-gray-400">
                                      {product.length && product.width && product.height 
                                        ? `${product.length}×${product.width}×${product.height}` 
                                        : 'N/A'
                                      }
                                    </div>
                                    <div className={`text-sm ${product.quantity ? 'text-[#f8c017] font-medium' : 'text-gray-500'}`}>
                                      {product.quantity || 'None'}
                                    </div>
                                    <div className={`text-xs ${product.warehouseCode ? 'text-[#f8c017]' : 'text-gray-400'}`}>
                                      {product.warehouseCode || 'Default'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-gray-600 text-gray-300 hover:border-gray-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={!bulkFile || isCreatingProduct}
                    className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90 disabled:opacity-50"
                  >
                    {isCreatingProduct ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border border-black border-t-transparent mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      'Upload Products'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}