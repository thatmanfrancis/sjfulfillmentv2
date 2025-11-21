'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { post } from '@/lib/api';

interface BulkActionsModalProps {
  onActionCompleted: () => void;
}

export function BulkActionsModal({ onActionCompleted }: BulkActionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [actionData, setActionData] = useState({
    quantity: '',
    reason: '',
    warehouseId: '',
    productIds: '',
    notes: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const payload = {
        action: selectedAction,
        ...actionData,
        productIds: actionData.productIds.split(',').map(id => id.trim()).filter(Boolean),
        quantity: actionData.quantity ? parseInt(actionData.quantity) : undefined
      };

      const response = await post('/api/admin/inventory/bulk-actions', payload) as any;

      if (response?.success) {
        setIsOpen(false);
        setSelectedAction('');
        setActionData({
          quantity: '',
          reason: '',
          warehouseId: '',
          productIds: '',
          notes: ''
        });
        onActionCompleted();
      } else {
        setErrors([response?.error || 'Bulk action failed']);
      }
    } catch (error: any) {
      console.error('Bulk action error:', error);
      setErrors([error?.message || 'Failed to perform bulk action']);
    } finally {
      setLoading(false);
    }
  };

  const bulkActions = [
    {
      id: 'adjust_stock',
      name: 'Adjust Stock Levels',
      description: 'Increase or decrease inventory quantities',
      icon: TrendingUp,
      color: 'text-blue-400'
    },
    {
      id: 'restock',
      name: 'Bulk Restock',
      description: 'Add inventory across multiple products',
      icon: Package,
      color: 'text-green-400'
    },
    {
      id: 'destock',
      name: 'Bulk Destock',
      description: 'Remove inventory across multiple products',
      icon: TrendingDown,
      color: 'text-red-400'
    },
    {
      id: 'refresh_tracking',
      name: 'Refresh Tracking',
      description: 'Update inventory tracking data',
      icon: RefreshCw,
      color: 'text-purple-400'
    },
    {
      id: 'mark_damaged',
      name: 'Mark as Damaged',
      description: 'Mark items as damaged or defective',
      icon: AlertTriangle,
      color: 'text-orange-400'
    },
    {
      id: 'quality_check',
      name: 'Queue Quality Check',
      description: 'Add items to quality control queue',
      icon: CheckCircle2,
      color: 'text-teal-400'
    }
  ];

  const selectedActionDetails = bulkActions.find(action => action.id === selectedAction);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
          <Package className="w-4 h-4 mr-2" />
          Bulk Actions
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-brand-black border-brand-black/20 bg-linear-to-br from-brand-black to-white/5 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-brand-gold flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Admin Bulk Inventory Actions
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Perform bulk operations on inventory items across all warehouses.
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
            <div className="flex items-center text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-medium">Action Failed</span>
            </div>
            <ul className="text-sm text-red-300 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Action Selection */}
          <div>
            <Label className="text-gray-300 mb-3 block">Select Bulk Action</Label>
            <div className="grid grid-cols-2 gap-3">
              {bulkActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setSelectedAction(action.id)}
                    className={`p-4 border rounded-lg text-left transition-all duration-200 ${
                      selectedAction === action.id
                        ? 'border-brand-gold bg-brand-gold/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon className={`w-5 h-5 ${action.color}`} />
                      <span className="font-medium text-white text-sm">{action.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedAction && (
            <>
              {/* Action Details */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {selectedActionDetails && (
                    <>
                      <selectedActionDetails.icon className={`w-4 h-4 ${selectedActionDetails.color}`} />
                      <span className="font-medium text-brand-gold">{selectedActionDetails.name}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-300">{selectedActionDetails?.description}</p>
              </div>

              {/* Product IDs */}
              <div>
                <Label htmlFor="productIds" className="text-gray-300">
                  Product IDs or SKUs
                </Label>
                <Textarea
                  id="productIds"
                  placeholder="Enter product IDs or SKUs separated by commas&#10;Example: PROD-001, PROD-002, SKU-123"
                  value={actionData.productIds}
                  onChange={(e) => setActionData(prev => ({ ...prev, productIds: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 mt-1"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to apply to all products in selected warehouse
                </p>
              </div>

              {/* Warehouse Selection */}
              <div>
                <Label className="text-gray-300">Target Warehouse</Label>
                <Select 
                  value={actionData.warehouseId} 
                  onValueChange={(value) => setActionData(prev => ({ ...prev, warehouseId: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue placeholder="Select warehouse (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all" className="text-white">All Warehouses</SelectItem>
                    <SelectItem value="main" className="text-white">Main Warehouse</SelectItem>
                    <SelectItem value="secondary" className="text-white">Secondary Warehouse</SelectItem>
                    <SelectItem value="admin" className="text-white">Admin Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity (for stock actions) */}
              {['adjust_stock', 'restock', 'destock'].includes(selectedAction) && (
                <div>
                  <Label htmlFor="quantity" className="text-gray-300">
                    Quantity {selectedAction === 'adjust_stock' ? '(+/- for adjustment)' : ''}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder={selectedAction === 'adjust_stock' ? '+100 or -50' : '100'}
                    value={actionData.quantity}
                    onChange={(e) => setActionData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 mt-1"
                    required
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <Label htmlFor="reason" className="text-gray-300">Reason for Action</Label>
                <Select 
                  value={actionData.reason} 
                  onValueChange={(value) => setActionData(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="admin_adjustment" className="text-white">Admin Adjustment</SelectItem>
                    <SelectItem value="inventory_correction" className="text-white">Inventory Correction</SelectItem>
                    <SelectItem value="damage_write_off" className="text-white">Damage Write-off</SelectItem>
                    <SelectItem value="theft_loss" className="text-white">Theft/Loss</SelectItem>
                    <SelectItem value="quality_control" className="text-white">Quality Control</SelectItem>
                    <SelectItem value="system_sync" className="text-white">System Sync</SelectItem>
                    <SelectItem value="audit_adjustment" className="text-white">Audit Adjustment</SelectItem>
                    <SelectItem value="other" className="text-white">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes" className="text-gray-300">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes about this bulk action..."
                  value={actionData.notes}
                  onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 mt-1"
                  rows={2}
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">
                      Admin Action Warning
                    </p>
                    <p className="text-yellow-300 text-xs mt-1">
                      This will perform bulk operations across multiple inventory items. 
                      Please verify the action and affected items before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </>
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
              disabled={!selectedAction || loading}
              className="gradient-gold text-black shadow-gold font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Execute Bulk Action
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}