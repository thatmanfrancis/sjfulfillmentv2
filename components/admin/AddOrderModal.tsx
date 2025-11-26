// AddOrderModal.tsx
// This modal will support both calculated and manual total amount, and move search/search result to the top inside the modal.

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export default function AddOrderModal({ isOpen, onClose, onOrderCreated }: AddOrderModalProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [items, setItems] = useState<Array<{ sku: string; quantity: number; price?: number }>>([]);
  const [manualTotalAmount, setManualTotalAmount] = useState<number | ''>('');
  const [useManualTotal, setUseManualTotal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search handler (real API)
  const handleSearch = async () => {
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setSearchResults(data.products.map((p: any) => ({ sku: p.sku, name: p.name, price: p.price })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setSearchResults([]);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    setLoading(true);
    const orderPayload: any = {
      customerName,
      customerPhone,
      customerAddress,
      businessName,
      items: items.map(item => ({ sku: item.sku, quantity: item.quantity })),
    };
    // If any item price is missing and manualTotalAmount is provided, send manualTotalAmount
    if (useManualTotal && manualTotalAmount) {
      orderPayload.manualTotalAmount = manualTotalAmount;
    }
    try {
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Order creation failed');
      onOrderCreated();
      onClose();
    } catch (err) {
      // Optionally show error toast
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Order</DialogTitle>
        </DialogHeader>
        {/* Search and results at top of modal */}
        <div className="mb-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button onClick={handleSearch} size="sm">Search</Button>
          </div>
          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded p-2 bg-gray-50">
              {searchResults.map((result, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span>{result.name} ({result.sku})</span>
                  <span>{typeof result.price === 'number' ? `₦${result.price}` : 'No price'}</span>
                  <Button size="sm" onClick={() => setItems([...items, { sku: result.sku, quantity: 1, price: result.price }])}>Add</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Customer info below search */}
        <div className="mb-4">
          <Input placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mb-2" />
          <Input placeholder="Customer Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mb-2" />
          <Input placeholder="Customer Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="mb-2" />
          <Input placeholder="Business Name" value={businessName} onChange={e => setBusinessName(e.target.value)} className="mb-2" />
        </div>
        {/* Items list */}
        <div className="mb-4">
          <div className="font-semibold mb-2">Order Items</div>
          {items.length === 0 && <div className="text-sm text-gray-500">No items added.</div>}
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center mb-1">
              <span>{item.sku}</span>
              <Input type="number" min={1} value={item.quantity} onChange={e => {
                const newItems = [...items];
                newItems[idx].quantity = Number(e.target.value);
                setItems(newItems);
              }} className="w-16" />
              <span>{typeof item.price === 'number' ? `₦${item.price}` : 'No price'}</span>
              <Button size="sm" variant="destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Remove</Button>
            </div>
          ))}
        </div>
        {/* Manual total amount field if any item price is missing */}
        {items.some(item => typeof item.price !== 'number') && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">Manual Total Amount</label>
            <Input
              type="number"
              min={0}
              value={manualTotalAmount}
              onChange={e => setManualTotalAmount(Number(e.target.value))}
              placeholder="Enter total amount for order"
            />
            <div className="flex items-center mt-2">
              <input type="checkbox" checked={useManualTotal} onChange={e => setUseManualTotal(e.target.checked)} />
              <span className="ml-2 text-sm">Use manual total amount</span>
            </div>
          </div>
        )}
        <Button onClick={handleSubmit} disabled={loading} className="w-full">Create Order</Button>
      </DialogContent>
    </Dialog>
  );
}
