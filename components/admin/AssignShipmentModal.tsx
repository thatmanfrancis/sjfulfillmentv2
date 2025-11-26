import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LogisticsPersonnel {
  id: string;
  firstName: string;
  lastName: string;
  status: 'free' | 'occupied';
}

interface Warehouse {
  id: string;
  name: string;
  region: string;
  availableQuantity: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  product: Product;
  orderedQuantity: number;
  onAssigned: () => void;
}

const AssignShipmentModal: React.FC<AssignModalProps> = ({ open, onClose, orderId, product, orderedQuantity, onAssigned }) => {
  const [logistics, setLogistics] = useState<LogisticsPersonnel[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(orderedQuantity);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [shipmentInfo, setShipmentInfo] = useState<{ baseCurrency: string; cost: number } | null>(null);

  useEffect(() => {
    if (open) {
      // Fetch logistics personnel
      fetch(`/api/admin/logistics?status=all`)
        .then(res => res.json())
        .then(data => setLogistics(data?.logistics || []));
      // Fetch warehouses with product availability
      fetch(`/api/admin/warehouses?productId=${product.id}`)
        .then(res => res.json())
        .then(data => setWarehouses(data?.warehouses || []));
      // Fetch shipment info (baseCurrency, cost)
      fetch(`/api/shipments?orderId=${orderId}`)
        .then(res => res.json())
        .then(data => {
          const shipment = data?.shipments?.[0];
          if (shipment) {
            setShipmentInfo({ baseCurrency: shipment.baseCurrency, cost: shipment.cost });
          }
        });
    }
  }, [open, product.id, orderId]);

  const handleAssign = async () => {
    setError('');
    if (!selectedLogistics) {
      setError('Please select a logistics personnel.');
      return;
    }
    const logisticsPerson = logistics.find(l => l.id === selectedLogistics);
    if (logisticsPerson?.status === 'occupied') {
      setError('Cannot assign to a busy logistics personnel.');
      toast({
        title: 'Assignment Error',
        description: 'Cannot assign to a busy logistics personnel.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedWarehouse) {
      setError('Please select a warehouse.');
      return;
    }
    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    if (!warehouse || quantity > warehouse.availableQuantity) {
      setError('Selected quantity exceeds warehouse stock.');
      return;
    }
    if (quantity > orderedQuantity) {
      setError('Selected quantity exceeds ordered quantity.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/shipments/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        logisticsId: selectedLogistics,
        warehouseId: selectedWarehouse,
        productId: product.id,
        quantity,
      })
    });
    setLoading(false);
    if (res.ok) {
      onAssigned();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to assign shipment.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-2 border-[#f8c017] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Assign Logistics & Warehouse</DialogTitle>
        </DialogHeader>
        {shipmentInfo && (
          <div className="mb-4">
            <div className="text-gray-400 text-sm">Shipment Cost: <span className="text-white font-bold">{shipmentInfo.cost} {shipmentInfo.baseCurrency}</span></div>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-1">Logistics Personnel</label>
          <select
            value={selectedLogistics}
            onChange={e => setSelectedLogistics(e.target.value)}
            className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white"
          >
            <option value="">Select...</option>
            {logistics.map(l => (
              <option key={l.id} value={l.id} className={l.status === 'occupied' ? 'text-red-500' : 'text-green-500'}>
                {l.firstName} {l.lastName} {l.status === 'free' ? <>(<span style={{color:'limegreen'}}>Free</span>)</> : <>(<span style={{color:'red'}}>Occupied</span>)</>}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-1">Warehouse (with product in stock)</label>
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white"
          >
            <option value="">Select...</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.region}) - {w.availableQuantity} in stock
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-1">Quantity to Pick Up</label>
          <input
            type="number"
            min={1}
            max={Math.min(orderedQuantity, selectedWarehouse ? (warehouses.find(w => w.id === selectedWarehouse)?.availableQuantity || 1) : orderedQuantity)}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#23232b] text-white"
          />
          <div className="text-xs text-gray-400 mt-1">Max: {Math.min(orderedQuantity, selectedWarehouse ? (warehouses.find(w => w.id === selectedWarehouse)?.availableQuantity || 1) : orderedQuantity)}</div>
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            className="bg-[#f8c017] text-black font-bold hover:bg-[#f8c017]/80"
            onClick={handleAssign}
            disabled={loading}
          >
            {loading ? 'Assigning...' : 'Assign'}
          </Button>
          <Button
            variant="outline"
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignShipmentModal;
