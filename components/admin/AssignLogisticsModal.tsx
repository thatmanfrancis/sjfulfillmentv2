
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignLogisticsModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  onAssigned: () => void;
}

// Helper for deep copy
function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export default function AssignLogisticsModal({ open, onClose, orderId, onAssigned }: AssignLogisticsModalProps) {
    const [note, setNote] = useState('');
  const [logistics, setLogistics] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]); // [{id, sku, name, quantity}]
  const [allocations, setAllocations] = useState<any>({}); // { [productId]: [{ warehouseId, warehouseName, availableStock }] }
  const [picks, setPicks] = useState<any>({}); // { [productId]: [{ warehouseId, quantity }] }

  // Fetch logistics partners
  useEffect(() => {
    if (open) {
      fetch('/api/admin/logistics')
        .then(res => res.json())
        .then(data => setLogistics(Array.isArray(data) ? data : data.users || []));
    }
  }, [open]);

  // Fetch order items and stock allocations
  useEffect(() => {
    if (open && orderId) {
      // Fetch order details (items)
      fetch(`/api/admin/orders?orderId=${orderId}`)
        .then(res => res.json())
        .then(async data => {
          const order = (data.orders && data.orders.length > 0) ? data.orders[0] : null;
          if (!order) return;
          setOrderItems(order.items.map((item: any) => ({
            id: item.id,
            sku: item.product.sku,
            name: item.product.name,
            quantity: item.quantity,
            productId: item.product.id || item.productId // Prefer product.id if available
          })));

          // For each product, fetch stock allocations (skip if productId is missing)
          const allocs: any = {};
          for (const item of order.items) {
            const pid = item.product.id || item.productId;
            if (!pid || typeof pid !== 'string' || pid.length < 3) {
              console.warn('AssignLogisticsModal: Missing or invalid productId for item', item);
              continue;
            }
            console.log('AssignLogisticsModal: Fetching allocations for productId', pid);
            const resp = await fetch(`/api/stock-allocations?productId=${pid}`);
            const allocData = await resp.json();
            console.log('AssignLogisticsModal: Allocation fetch result for', pid, allocData);
            allocs[pid] = (allocData.allocations || []).map((a: any) => ({
              warehouseId: a.warehouseId,
              warehouseName: a.Warehouse?.name || '',
              availableStock: a.allocatedQuantity
            }));
            if (!allocData.allocations || allocData.allocations.length === 0) {
              console.warn('AssignLogisticsModal: No allocations found for productId', pid);
            }
          }
          setAllocations(allocs);
          // Initialize picks
          const initialPicks: any = {};
          for (const item of order.items) {
            const pid = item.product.id || item.productId;
            if (!pid || typeof pid !== 'string' || pid.length < 3) continue;
            initialPicks[pid] = allocs[pid]?.map((a: any) => ({
              warehouseId: a.warehouseId,
              quantity: 0
            })) || [];
          }
          setPicks(initialPicks);
        });
    }
  }, [open, orderId]);

  // Handle pick quantity change
  const handlePickChange = (productId: string, warehouseId: string, value: number) => {
    setPicks((prev: any) => {
      const updated = clone(prev);
      const arr = updated[productId] || [];
      const idx = arr.findIndex((a: any) => a.warehouseId === warehouseId);
      if (idx !== -1) {
        // Calculate total picked for other warehouses
        const totalOther = arr.reduce((sum: number, a: any, i: number) => i === idx ? sum : sum + (a.quantity || 0), 0);
        // Get required quantity for this product
        const required = (orderItems.find((itm: any) => itm.productId === productId)?.quantity) || 0;
        // Restrict value so total picked does not exceed required
        const maxAllowed = Math.min(value, required - totalOther, allocations[productId]?.[idx]?.availableStock || 0);
        arr[idx].quantity = Math.max(0, maxAllowed);
      }
      updated[productId] = arr;
      return updated;
    });
  };

  // Validation: total picked == required, and not over available
  const validatePicks = () => {
    for (const item of orderItems) {
      const totalPicked = (picks[item.productId] || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
      if (totalPicked !== item.quantity) return false;
      // Check not over available
      for (const pick of picks[item.productId] || []) {
        const alloc = (allocations[item.productId] || []).find((a: any) => a.warehouseId === pick.warehouseId);
        if (pick.quantity > (alloc?.availableStock || 0)) return false;
      }
    }
    return true;
  };

  const handleAssign = async () => {
    if (!orderId || !selected) return;
    if (!validatePicks()) {
      setError('Please ensure all items are fully and validly allocated from warehouses.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logisticsId: selected,
          warehousePicks: orderItems.map(item => ({
            productId: item.productId,
            picks: (picks[item.productId] || []).filter((p: any) => p.quantity > 0)
          })),
          note: note.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to assign logistics');
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-2 border-[#f8c017] max-w-2xl shadow-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">Assign Logistics & Warehouses</DialogTitle>
        </DialogHeader>
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-1 font-semibold">Logistics Partner</label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full bg-[#23232b] border border-gray-600 text-white rounded-md focus:border-[#f8c017] focus:ring-[#f8c017]">
              <SelectValue placeholder="Select logistics partner" />
            </SelectTrigger>
            <SelectContent className="bg-[#23232b] border border-gray-600 text-white rounded-md">
              {logistics.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-white">
                  {l.firstName} {l.lastName} <span className="text-xs text-gray-400">({l.email})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mb-6">
          <div className="text-gray-400 font-semibold mb-2">Warehouses & Quantities</div>
          {orderItems.map(item => (
            <div key={item.id} className="mb-4 p-4 bg-[#23232b] rounded-lg border border-gray-600">
              <div className="mb-2 text-[#f8c017] font-bold">{item.name} <span className="text-xs text-gray-400">(SKU: {item.sku})</span> <span className="ml-2 text-xs text-gray-400">Qty: {item.quantity}</span></div>
              {(allocations[item.productId] || []).length === 0 ? (
                <div className="text-red-400 text-sm">No stock allocations found for this product.</div>
              ) : (
                <div className="space-y-2">
                  {(allocations[item.productId] || []).map((alloc: any, idx: number) => {
                    // Calculate total picked for other warehouses
                    const totalOther = (picks[item.productId] || []).reduce((sum: number, p: any, i: number) => i === idx ? sum : sum + (p.quantity || 0), 0);
                    // Get required quantity for this product
                    const required = item.quantity;
                    // Restrict max input for this warehouse
                    const maxInput = Math.min(alloc.availableStock, required - totalOther);
                    return (
                      <div key={alloc.warehouseId} className="flex items-center gap-4">
                        <span className="text-white text-sm w-44">{alloc.warehouseName}</span>
                        <span className="text-gray-400 text-xs">Available: {alloc.availableStock}</span>
                        <input
                          type="number"
                          min={0}
                          max={maxInput}
                          value={picks[item.productId]?.[idx]?.quantity || 0}
                          onChange={e => handlePickChange(item.productId, alloc.warehouseId, Math.max(0, Math.min(maxInput, Number(e.target.value))))}
                          className="w-20 px-2 py-1 rounded bg-[#18181b] border border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-400">
                Total picked: <span className="font-bold text-white">{(picks[item.productId] || []).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)}</span> / <span className="font-bold text-white">{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
        {error && <div className="text-red-500 text-sm mb-4 font-semibold">{error}</div>}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-1 font-semibold">Note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full min-h-[60px] px-3 py-2 rounded-md bg-[#23232b] border border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="Add instructions or notes for logistics..."
          />
        </div>
        <Button onClick={handleAssign} disabled={loading || !selected || !validatePicks()} className="w-full bg-[#f8c017] text-black font-bold py-3 rounded-md hover:bg-[#e6b800] transition-all">
          {loading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
