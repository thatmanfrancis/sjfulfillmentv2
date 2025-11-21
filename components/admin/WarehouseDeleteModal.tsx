'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { get, del } from '@/lib/api';

interface Warehouse {
  id: string;
  name: string;
  region: string;
  capacity: number;
  currentStock: number;
  status: string;
}

interface ProductInWarehouse {
  productId: string;
  productName: string;
  productSku: string;
  allocatedQuantity: number;
  safetyStock: number;
}

interface WarehouseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onDeleted: () => void;
}

export default function WarehouseDeleteModal({ isOpen, onClose, warehouse, onDeleted }: WarehouseDeleteModalProps) {
  const [step, setStep] = useState<'confirm' | 'migrate'>('confirm');
  const [loading, setLoading] = useState(false);
  const [productsInWarehouse, setProductsInWarehouse] = useState<ProductInWarehouse[]>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>([]);
  const [migrationPlan, setMigrationPlan] = useState<Record<string, { warehouseId: string; quantity: number }[]>>({});
  const [selectedTargetWarehouse, setSelectedTargetWarehouse] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && warehouse) {
      fetchProductsInWarehouse();
      fetchAvailableWarehouses();
      setStep('confirm');
      setError('');
      setMigrationPlan({});
      setSelectedTargetWarehouse('');
    }
  }, [isOpen, warehouse]);

  const fetchProductsInWarehouse = async () => {
    if (!warehouse) return;
    
    try {
      const data = await get(`/api/admin/warehouses/${warehouse.id}/products`) as { products: ProductInWarehouse[] };
      setProductsInWarehouse(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProductsInWarehouse([]);
    }
  };

  const fetchAvailableWarehouses = async () => {
    if (!warehouse) return;
    
    try {
      const data = await get('/api/admin/warehouses?status=ACTIVE') as { warehouses: Warehouse[] };
      const filtered = data.warehouses?.filter((w: Warehouse) => w.id !== warehouse.id) || [];
      setAvailableWarehouses(filtered);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setAvailableWarehouses([]);
    }
  };

  const calculateMigrationPlan = () => {
    if (!selectedTargetWarehouse) return;

    const targetWarehouse = availableWarehouses.find(w => w.id === selectedTargetWarehouse);
    if (!targetWarehouse) return;

    const totalProductsQuantity = productsInWarehouse.reduce((sum, p) => sum + p.allocatedQuantity, 0);
    const availableCapacity = targetWarehouse.capacity - targetWarehouse.currentStock;

    if (totalProductsQuantity <= availableCapacity) {
      // All products can go to selected warehouse
      const plan: Record<string, { warehouseId: string; quantity: number }[]> = {};
      productsInWarehouse.forEach(product => {
        plan[product.productId] = [{
          warehouseId: selectedTargetWarehouse,
          quantity: product.allocatedQuantity
        }];
      });
      setMigrationPlan(plan);
    } else {
      // Need to distribute across multiple warehouses
      distributeAcrossMultipleWarehouses();
    }
  };

  const distributeAcrossMultipleWarehouses = () => {
    const plan: Record<string, { warehouseId: string; quantity: number }[]> = {};
    const warehouseCapacities = new Map();
    
    // Initialize available capacities
    availableWarehouses.forEach(w => {
      warehouseCapacities.set(w.id, w.capacity - w.currentStock);
    });

    // Find or create default warehouse
    let defaultWarehouse = availableWarehouses.find(w => w.name.toLowerCase() === 'default');
    if (!defaultWarehouse && availableWarehouses.length > 0) {
      defaultWarehouse = availableWarehouses[0]; // Use first available as default
    }

    productsInWarehouse.forEach(product => {
      let remainingQuantity = product.allocatedQuantity;
      plan[product.productId] = [];

      // Try to allocate to warehouses with available capacity
      for (const warehouse of availableWarehouses) {
        if (remainingQuantity <= 0) break;
        
        const availableCapacity = warehouseCapacities.get(warehouse.id) || 0;
        if (availableCapacity > 0) {
          const allocatedHere = Math.min(remainingQuantity, availableCapacity);
          plan[product.productId].push({
            warehouseId: warehouse.id,
            quantity: allocatedHere
          });
          remainingQuantity -= allocatedHere;
          warehouseCapacities.set(warehouse.id, availableCapacity - allocatedHere);
        }
      }

      // If there's still remaining quantity, allocate to default warehouse
      if (remainingQuantity > 0 && defaultWarehouse) {
        plan[product.productId].push({
          warehouseId: defaultWarehouse.id,
          quantity: remainingQuantity
        });
      }
    });

    setMigrationPlan(plan);
  };

  const handleDeleteConfirm = async () => {
    if (productsInWarehouse.length > 0) {
      setStep('migrate');
      return;
    }

    // No products, proceed with direct deletion
    await handleFinalDelete();
  };

  const handleMigrateProducts = () => {
    if (!selectedTargetWarehouse) {
      setError('Please select a target warehouse for migration');
      return;
    }
    calculateMigrationPlan();
  };

  const handleFinalDelete = async () => {
    if (!warehouse) return;

    try {
      setDeleting(true);
      
      const deleteData: any = {
        force: productsInWarehouse.length === 0
      };

      if (productsInWarehouse.length > 0 && Object.keys(migrationPlan).length > 0) {
        deleteData.migrationPlan = migrationPlan;
      }

      // For delete operations with body, we need to use a different approach
      const response = await fetch(`/api/admin/warehouses/${warehouse.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete warehouse');
      }
      onDeleted();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to delete warehouse');
    } finally {
      setDeleting(false);
    }
  };

  const getWarehouseName = (id: string) => {
    return availableWarehouses.find(w => w.id === id)?.name || 'Unknown';
  };

  const getTotalMigrationItems = () => {
    return Object.values(migrationPlan).flat().reduce((sum, allocation) => sum + allocation.quantity, 0);
  };

  if (!warehouse) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border border-red-600/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Warehouse
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'confirm' 
              ? 'This action cannot be undone. This will permanently delete the warehouse.'
              : 'Configure product migration before deleting the warehouse.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <Card className="bg-[#2a2a2a] border border-gray-600">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">{warehouse.name}</h3>
                  <p className="text-gray-400 text-sm">Region: {warehouse.region}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-300">Capacity: {warehouse.capacity.toLocaleString()}</span>
                    <span className="text-gray-300">Current Stock: {warehouse.currentStock.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {productsInWarehouse.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800 font-medium">Active Products Found</span>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  This warehouse contains {productsInWarehouse.length} products with active inventory. 
                  You'll need to migrate these products to other warehouses before deletion.
                </p>
                <div className="space-y-1">
                  {productsInWarehouse.slice(0, 3).map(product => (
                    <div key={product.productId} className="text-xs text-yellow-700">
                      • {product.productName} ({product.productSku}): {product.allocatedQuantity} units
                    </div>
                  ))}
                  {productsInWarehouse.length > 3 && (
                    <div className="text-xs text-yellow-700">
                      • ... and {productsInWarehouse.length - 3} more products
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:border-gray-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {productsInWarehouse.length > 0 ? 'Configure Migration' : 'Delete Warehouse'}
              </Button>
            </div>
          </div>
        )}

        {step === 'migrate' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-medium mb-2">Product Migration Required</h3>
              <p className="text-blue-700 text-sm">
                Select a target warehouse to move {productsInWarehouse.length} products with {productsInWarehouse.reduce((sum, p) => sum + p.allocatedQuantity, 0)} total units.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Target Warehouse</Label>
                <Select value={selectedTargetWarehouse} onValueChange={setSelectedTargetWarehouse}>
                  <SelectTrigger className="w-full bg-white border-gray-300 text-black">
                    <SelectValue placeholder="Select warehouse for migration" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300">
                    <SelectItem value="default" className="text-black hover:bg-gray-100">
                      Auto-distribute (Default Warehouse)
                    </SelectItem>
                    {availableWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-black hover:bg-gray-100">
                        {w.name} ({w.region}) - Available: {(w.capacity - w.currentStock).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTargetWarehouse && (
                <Button 
                  onClick={handleMigrateProducts}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Generate Migration Plan
                </Button>
              )}
            </div>

            {Object.keys(migrationPlan).length > 0 && (
              <div className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-600">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Migration Plan
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(migrationPlan).map(([productId, allocations]) => {
                    const product = productsInWarehouse.find(p => p.productId === productId);
                    return (
                      <div key={productId} className="bg-[#1a1a1a] rounded p-2 text-sm">
                        <div className="text-white font-medium">{product?.productName} ({product?.productSku})</div>
                        <div className="flex items-center gap-2 text-gray-300 mt-1">
                          <ArrowRight className="h-3 w-3" />
                          {allocations.map((alloc, idx) => (
                            <span key={idx} className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">
                              {getWarehouseName(alloc.warehouseId)}: {alloc.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-center">
                  <Badge variant="outline" className="border-green-600 text-green-400">
                    Total: {getTotalMigrationItems()} units to migrate
                  </Badge>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('confirm')}
                disabled={deleting}
                className="border-gray-600 text-gray-300 hover:border-gray-500"
              >
                Back
              </Button>
              <Button
                onClick={handleFinalDelete}
                disabled={Object.keys(migrationPlan).length === 0 || deleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete Warehouse & Migrate Products
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}