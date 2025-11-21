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

export default function AssignLogisticsModal({ open, onClose, orderId, onAssigned }: AssignLogisticsModalProps) {
  const [logistics, setLogistics] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/api/admin/logistics')
        .then(res => res.json())
        .then(data => setLogistics(Array.isArray(data) ? data : data.users || []));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!orderId || !selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logisticsId: selected })
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
      <DialogContent className="bg-black border-2 border-[#f8c017] shadow-[0_0_16px_2px_#f8c01755]">
        <DialogHeader>
          <DialogTitle className="text-white">Assign Logistics Partner</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full bg-[#181818] border border-[#f8c017] text-white">
              <SelectValue placeholder="Select logistics partner" />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border border-[#f8c017] text-white">
              {logistics.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-white">
                  {l.firstName} {l.lastName} ({l.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <Button onClick={handleAssign} disabled={loading || !selected} className="w-full bg-[#f8c017] text-black font-semibold hover:bg-[#e6b800]">
          {loading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
