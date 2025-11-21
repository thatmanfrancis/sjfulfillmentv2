'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  Truck
} from 'lucide-react';
import { get, post } from '@/lib/api';

interface StockTransferModalProps {
  onTransferCreated: () => void;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  region: string;
  capacity: number;
  currentStock: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  availableStock: number;
}

export function StockTransferModal({ onTransferCreated }: StockTransferModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const [transferData, setTransferData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    quantity: '',
    priority: 'normal',
    reason: '',
    notes: '',
    scheduledDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (transferData.fromWarehouseId) {
      fetchProducts(transferData.fromWarehouseId);
    }
  }, [transferData.fromWarehouseId]);

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const response: any = await get('/api/admin/warehouses');
      setWarehouses(response.warehouses || []);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setErrors(['Failed to load warehouses']);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchProducts = async (warehouseId: string) => {
    setLoadingProducts(true);
    try {
      const response: any = await get(`/api/admin/warehouses/${warehouseId}/products`);
      const inventoryProducts = response.products?.map((item: any) => ({
        id: item.productId,
        name: item.productName,
        sku: item.productSku,
        currentStock: item.allocatedQuantity,
        availableStock: Math.max(0, item.allocatedQuantity - item.safetyStock)
      })) || [];
      setProducts(inventoryProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setErrors(['Failed to load products from warehouse']);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    // Validation
    const newErrors: string[] = [];
    
    if (!transferData.fromWarehouseId) newErrors.push('Source warehouse is required');
    if (!transferData.toWarehouseId) newErrors.push('Destination warehouse is required');
    if (!transferData.productId) newErrors.push('Product is required');
    if (!transferData.quantity || parseInt(transferData.quantity) <= 0) {
      newErrors.push('Valid quantity is required');
    }
    if (transferData.fromWarehouseId === transferData.toWarehouseId) {
      newErrors.push('Source and destination warehouses must be different');
    }

    const selectedProduct = products.find(p => p.id === transferData.productId);
    if (selectedProduct && parseInt(transferData.quantity) > selectedProduct.availableStock) {
      newErrors.push(`Only ${selectedProduct.availableStock} units available for transfer`);
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        fromWarehouseId: transferData.fromWarehouseId,
        toWarehouseId: transferData.toWarehouseId,
        productId: transferData.productId,
        quantity: parseInt(transferData.quantity),
        notes: transferData.notes || `Admin transfer - ${transferData.reason || 'Administrative action'}`
      };

      const response: any = await post('/api/inventory/transfers', payload);

      if (response.success) {
        setIsOpen(false);
        setTransferData({
          fromWarehouseId: '',
          toWarehouseId: '',
          productId: '',
          quantity: '',
          priority: 'normal',
          reason: '',
          notes: '',
          scheduledDate: ''
        });
        setProducts([]);
        onTransferCreated();
        
        // Show success message based on transfer status
        console.log(response.message || 'Stock transfer completed successfully');
      } else {
        setErrors([response.error || 'Transfer creation failed']);
      }
    } catch (error: any) {
      console.error('Stock transfer error:', error);
      setErrors([error?.message || 'Failed to create stock transfer']);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === transferData.productId);
  const fromWarehouse = warehouses.find(w => w.id === transferData.fromWarehouseId);
  const toWarehouse = warehouses.find(w => w.id === transferData.toWarehouseId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Stock Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-brand-black border-brand-black/20 bg-linear-to-br from-brand-black to-white/5 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-brand-gold flex items-center">
            <ArrowRightLeft className="w-5 h-5 mr-2" />
            Admin Stock Transfer
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Transfer inventory between warehouses with administrative privileges.
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
            <div className="flex items-center text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-medium">Transfer Error</span>
            </div>
            <ul className="text-sm text-red-300 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warehouse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">From Warehouse</Label>
              <Select 
                value={transferData.fromWarehouseId} 
                onValueChange={(value) => setTransferData(prev => ({ 
                  ...prev, 
                  fromWarehouseId: value,
                  productId: '' // Reset product when warehouse changes
                }))}
                disabled={loadingWarehouses}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id} className="text-white">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span>{warehouse.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {warehouse.region}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromWarehouse && (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {fromWarehouse.location} • Stock: {fromWarehouse.currentStock}/{fromWarehouse.capacity}
                </p>
              )}
            </div>

            <div>
              <Label className="text-gray-300">To Warehouse</Label>
              <Select 
                value={transferData.toWarehouseId} 
                onValueChange={(value) => setTransferData(prev => ({ ...prev, toWarehouseId: value }))}
                disabled={loadingWarehouses}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {warehouses.filter(w => w.id !== transferData.fromWarehouseId).map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id} className="text-white">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-green-400" />
                        <span>{warehouse.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {warehouse.region}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toWarehouse && (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {toWarehouse.location} • Stock: {toWarehouse.currentStock}/{toWarehouse.capacity}
                </p>
              )}
            </div>
          </div>

          {/* Transfer Flow Visualization */}
          {fromWarehouse && toWarehouse && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-blue-400 font-medium">{fromWarehouse.name}</p>
                    <p className="text-xs text-gray-400">{fromWarehouse.region}</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-0.5 bg-brand-gold"></div>
                      <Truck className="w-5 h-5 text-brand-gold" />
                      <div className="w-8 h-0.5 bg-brand-gold"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-2">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-green-400 font-medium">{toWarehouse.name}</p>
                    <p className="text-xs text-gray-400">{toWarehouse.region}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <Label className="text-gray-300">Product to Transfer</Label>
            <Select 
              value={transferData.productId} 
              onValueChange={(value) => setTransferData(prev => ({ ...prev, productId: value }))}
              disabled={!transferData.fromWarehouseId || loadingProducts}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                <SelectValue placeholder={
                  !transferData.fromWarehouseId 
                    ? "Select source warehouse first" 
                    : loadingProducts 
                    ? "Loading products..." 
                    : "Select product"
                } />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-white">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-gray-400 ml-2">({product.sku})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {product.availableStock} available
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Current Stock:</span>
                  <span className="text-white font-medium">{selectedProduct.currentStock}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Available for Transfer:</span>
                  <span className="text-green-400 font-medium">{selectedProduct.availableStock}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity" className="text-gray-300">Transfer Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.availableStock || undefined}
                placeholder="Enter quantity"
                value={transferData.quantity}
                onChange={(e) => setTransferData(prev => ({ ...prev, quantity: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 mt-1"
                required
              />
              {selectedProduct && transferData.quantity && (
                <p className="text-xs text-gray-400 mt-1">
                  Max: {selectedProduct.availableStock} available
                </p>
              )}
            </div>

            <div>
              <Label className="text-gray-300">Transfer Priority</Label>
              <Select 
                value={transferData.priority} 
                onValueChange={(value) => setTransferData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="low" className="text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Low Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="normal" className="text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Normal Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>High Priority</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent" className="text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason and Scheduled Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Transfer Reason</Label>
              <Select 
                value={transferData.reason} 
                onValueChange={(value) => setTransferData(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="rebalancing" className="text-white">Inventory Rebalancing</SelectItem>
                  <SelectItem value="demand_fulfillment" className="text-white">Demand Fulfillment</SelectItem>
                  <SelectItem value="overflow" className="text-white">Overflow Management</SelectItem>
                  <SelectItem value="maintenance" className="text-white">Warehouse Maintenance</SelectItem>
                  <SelectItem value="optimization" className="text-white">Distribution Optimization</SelectItem>
                  <SelectItem value="emergency" className="text-white">Emergency Transfer</SelectItem>
                  <SelectItem value="admin_directive" className="text-white">Admin Directive</SelectItem>
                  <SelectItem value="other" className="text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduledDate" className="text-gray-300">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={transferData.scheduledDate}
                onChange={(e) => setTransferData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty for immediate transfer
              </p>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes" className="text-gray-300">Transfer Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this transfer..."
              value={transferData.notes}
              onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 mt-1"
              rows={2}
            />
          </div>

          {/* Transfer Summary */}
          {transferData.quantity && selectedProduct && fromWarehouse && toWarehouse && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-brand-gold font-medium mb-3">Transfer Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Product:</span>
                  <span className="text-white">{selectedProduct.name} ({selectedProduct.sku})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity:</span>
                  <span className="text-white font-medium">{transferData.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <span className="text-blue-400">{fromWarehouse.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <span className="text-green-400">{toWarehouse.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority:</span>
                  <Badge variant="outline" className="text-xs">
                    {transferData.priority}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gradient-gold text-black shadow-gold font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Transfer...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}