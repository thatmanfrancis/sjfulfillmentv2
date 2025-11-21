'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { post } from '@/lib/api';

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportGenerated?: (report: any) => void;
}

export interface ReportConfig {
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  includeCharts: boolean;
  includeDetails: boolean;
  includeFinancials: boolean;
  groupBy: string;
}

const REPORT_TYPES = [
  {
    value: 'SALES',
    label: 'Sales Performance',
    description: 'Revenue, order trends, and sales analytics',
    icon: '📊',
  },
  {
    value: 'INVENTORY',
    label: 'Inventory Status',
    description: 'Stock levels, low stock alerts, and inventory valuation',
    icon: '📦',
  },
  {
    value: 'MERCHANT',
    label: 'Merchant Activity',
    description: 'Merchant usage statistics and account status',
    icon: '🏪',
  },
  {
    value: 'LOGISTICS',
    label: 'Logistics Performance',
    description: 'Delivery performance and logistics costs',
    icon: '🚚',
  },
  {
    value: 'FINANCIAL',
    label: 'Financial Summary',
    description: 'Revenue, expenses, and profit analysis',
    icon: '💰',
  },
  {
    value: 'COMPREHENSIVE',
    label: 'Comprehensive Report',
    description: 'Complete business overview with all metrics',
    icon: '📋',
  },
];

const FORMAT_OPTIONS = [
  { value: 'PDF', label: 'PDF Document', description: 'Professional formatted report' },
  { value: 'Excel', label: 'Excel Spreadsheet', description: 'Data-rich spreadsheet format' },
  { value: 'CSV', label: 'CSV Data', description: 'Raw data for analysis' },
];

const GROUP_BY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Group data by day' },
  { value: 'weekly', label: 'Weekly', description: 'Group data by week' },
  { value: 'monthly', label: 'Monthly', description: 'Group data by month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Group data by quarter' },
];

export function GenerateReportModal({ open, onOpenChange, onReportGenerated }: GenerateReportModalProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'SALES',
    format: 'PDF',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    includeCharts: true,
    includeDetails: true,
    includeFinancials: false,
    groupBy: 'weekly',
  });

  const selectedReportType = REPORT_TYPES.find(type => type.value === reportConfig.type);
  const selectedFormat = FORMAT_OPTIONS.find(format => format.value === reportConfig.format);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);

      // Validate date range
      const startDate = new Date(reportConfig.startDate);
      const endDate = new Date(reportConfig.endDate);
      
      if (startDate >= endDate) {
        toast({
          title: "Invalid Date Range",
          description: "End date must be after start date.",
          variant: "destructive",
        });
        return;
      }

      if (startDate < new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)) {
        toast({
          title: "Date Range Too Old",
          description: "Please select a date range within the last 2 years.",
          variant: "destructive",
        });
        return;
      }

      const reportData = {
        reportType: reportConfig.type,
        parameters: {
          format: reportConfig.format,
          startDate: reportConfig.startDate,
          endDate: reportConfig.endDate,
          includeCharts: reportConfig.includeCharts,
          includeDetails: reportConfig.includeDetails,
          includeFinancials: reportConfig.includeFinancials,
          groupBy: reportConfig.groupBy,
          generatedAt: new Date().toISOString(),
          requestedBy: 'current-user', // This should come from session
        }
      };

      const response: any = await post('/api/reports/generate', reportData);
      
      if (response.success) {
        toast({
          title: "Report Generated Successfully",
          description: `${selectedReportType?.label} report has been generated and is ready for download.`,
        });

        // Automatically download the report
        if (response.downloadUrl) {
          window.open(response.downloadUrl, '_blank');
        }

        onReportGenerated?.(response.report);
        onOpenChange(false);
        
        // Reset form
        setReportConfig({
          type: 'SALES',
          format: 'PDF',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          includeCharts: true,
          includeDetails: true,
          includeFinancials: false,
          groupBy: 'weekly',
        });
      }
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateConfig = (key: keyof ReportConfig, value: any) => {
    setReportConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-black border border-brand-gold max-w-2xl max-h-[90vh] overflow-y-auto" 
        style={{backgroundColor: '#000000'}}
      >
        <DialogHeader>
          <DialogTitle className="text-brand-gold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Custom Report
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Configure your report parameters and generate a detailed business report with data from your selected date range.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Report Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_TYPES.map((type) => (
                <div 
                  key={type.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    reportConfig.type === type.value 
                      ? 'border-brand-gold bg-brand-gold/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => updateConfig('type', type.value)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white">{type.label}</h4>
                      <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-white">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="start-date"
                  type="date"
                  value={reportConfig.startDate}
                  onChange={(e) => updateConfig('startDate', e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                  max={reportConfig.endDate}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-white">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="end-date"
                  type="date"
                  value={reportConfig.endDate}
                  onChange={(e) => updateConfig('endDate', e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                  min={reportConfig.startDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Format and Grouping */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Output Format</Label>
              <Select value={reportConfig.format} onValueChange={(value) => updateConfig('format', value)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {FORMAT_OPTIONS.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-gray-400">{format.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Group Data By</Label>
              <Select value={reportConfig.groupBy} onValueChange={(value) => updateConfig('groupBy', value)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {GROUP_BY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Report Options */}
          <div className="space-y-3">
            <Label className="text-white">Report Content Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-white">Include Charts & Visualizations</h4>
                  <p className="text-xs text-gray-400">Add graphs, charts, and visual data representation</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={reportConfig.includeCharts}
                  onChange={(e) => updateConfig('includeCharts', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-brand-gold focus:ring-brand-gold"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-white">Detailed Transaction Data</h4>
                  <p className="text-xs text-gray-400">Include line-by-line transaction details</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={reportConfig.includeDetails}
                  onChange={(e) => updateConfig('includeDetails', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-brand-gold focus:ring-brand-gold"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-white">Financial Breakdowns</h4>
                  <p className="text-xs text-gray-400">Include costs, margins, and profit analysis</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={reportConfig.includeFinancials}
                  onChange={(e) => updateConfig('includeFinancials', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-brand-gold focus:ring-brand-gold"
                />
              </div>
            </div>
          </div>

          {/* Report Preview Info */}
          <div className="p-4 border border-brand-gold/30 rounded-lg bg-brand-gold/5">
            <h4 className="text-sm font-medium text-brand-gold mb-2">Report Summary</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <p><span className="text-gray-400">Type:</span> {selectedReportType?.label}</p>
              <p><span className="text-gray-400">Period:</span> {reportConfig.startDate} to {reportConfig.endDate}</p>
              <p><span className="text-gray-400">Format:</span> {selectedFormat?.label}</p>
              <p><span className="text-gray-400">Grouping:</span> {GROUP_BY_OPTIONS.find(g => g.value === reportConfig.groupBy)?.label}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateReport}
            disabled={generating}
            className="gradient-gold text-black font-semibold"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}