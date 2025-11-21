'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Table2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, options: ExportOptions) => void;
  totalProducts: number;
}

interface ExportOptions {
  includeInventory: boolean;
  includeBusinessInfo: boolean;
  includeWarehouseData: boolean;
  includeImages: boolean;
}

export default function ExportModal({ isOpen, onClose, onExport, totalProducts }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [options, setOptions] = useState<ExportOptions>({
    includeInventory: true,
    includeBusinessInfo: true,
    includeWarehouseData: false,
    includeImages: false,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, options);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Download className="h-5 w-5 text-[#f8c017]" />
            Export Products
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Export {totalProducts} products in your preferred format with selected options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">Export Format</Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={setSelectedFormat}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded-lg hover:border-[#f8c017]/50 transition-colors">
                <RadioGroupItem value="pdf" id="pdf" className="border-gray-500" />
                <Label htmlFor="pdf" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-400" />
                  <div>
                    <div className="font-medium">PDF Document</div>
                    <div className="text-xs text-gray-400">Formatted report with charts and images</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded-lg hover:border-[#f8c017]/50 transition-colors">
                <RadioGroupItem value="excel" id="excel" className="border-gray-500" />
                <Label htmlFor="excel" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Table2 className="h-4 w-4 text-green-400" />
                  <div>
                    <div className="font-medium">Excel Spreadsheet</div>
                    <div className="text-xs text-gray-400">Data in spreadsheet format for analysis</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">Include Data</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inventory"
                  checked={options.includeInventory}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeInventory: checked as boolean }))
                  }
                  className="border-gray-500"
                />
                <Label htmlFor="inventory" className="text-sm cursor-pointer">
                  Inventory & Stock Levels
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="business"
                  checked={options.includeBusinessInfo}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeBusinessInfo: checked as boolean }))
                  }
                  className="border-gray-500"
                />
                <Label htmlFor="business" className="text-sm cursor-pointer">
                  Business Information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="warehouse"
                  checked={options.includeWarehouseData}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeWarehouseData: checked as boolean }))
                  }
                  className="border-gray-500"
                />
                <Label htmlFor="warehouse" className="text-sm cursor-pointer">
                  Warehouse Distribution
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="images"
                  checked={options.includeImages}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeImages: checked as boolean }))
                  }
                  className="border-gray-500"
                />
                <Label htmlFor="images" className="text-sm cursor-pointer">
                  Product Images {selectedFormat === 'excel' && '(thumbnails only)'}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:border-gray-500"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}