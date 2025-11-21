import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';

interface ExportOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (dateFrom: string, dateTo: string) => void;
}

export default function ExportOrdersModal({ isOpen, onClose, onExport }: ExportOrdersModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await onExport(dateFrom, dateTo);
    setIsExporting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Download className="h-5 w-5 text-[#f8c017]" />
            Export Orders
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Export your orders as a PDF file for a specific date range.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-gray-300 mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#23232b] border border-gray-600 text-white" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#23232b] border border-gray-600 text-white" />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300 hover:border-gray-500">Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90">
            {isExporting ? 'Exporting...' : 'Export as PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
