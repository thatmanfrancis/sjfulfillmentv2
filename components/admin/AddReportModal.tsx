'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, BarChart3, Calendar, Settings, Database,
  TrendingUp, Users, DollarSign, Package, Truck,
  PieChart, LineChart, Download, Mail, Clock,
  Loader2, Filter
} from 'lucide-react';
import { post } from '@/lib/api';

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportAdded: () => void;
}

interface ReportFormData {
  title: string;
  description: string;
  type: 'SALES' | 'INVENTORY' | 'USERS' | 'FINANCIAL' | 'LOGISTICS' | 'PERFORMANCE' | 'CUSTOM' | '';
  category: 'DASHBOARD' | 'ANALYTICS' | 'COMPLIANCE' | 'OPERATIONAL' | 'EXECUTIVE' | '';
  format: 'PDF' | 'CSV' | 'EXCEL' | 'JSON' | '';
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | '';
  dataSource: string[];
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    includeInactive: boolean;
    region: string;
    department: string;
    customFilters: string;
  };
  scheduling: {
    isScheduled: boolean;
    scheduleTime: string;
    recipients: string;
    autoEmail: boolean;
  };
  visualization: {
    includeCharts: boolean;
    chartTypes: string[];
  };
  permissions: {
    isPublic: boolean;
    allowedRoles: string[];
  };
}

const initialFormData: ReportFormData = {
  title: '',
  description: '',
  type: '',
  category: '',
  format: 'PDF',
  frequency: 'ONCE',
  dataSource: [],
  dateRange: {
    start: '',
    end: ''
  },
  filters: {
    includeInactive: false,
    region: '',
    department: '',
    customFilters: ''
  },
  scheduling: {
    isScheduled: false,
    scheduleTime: '',
    recipients: '',
    autoEmail: false
  },
  visualization: {
    includeCharts: true,
    chartTypes: []
  },
  permissions: {
    isPublic: false,
    allowedRoles: []
  }
};

export default function AddReportModal({ isOpen, onClose, onReportAdded }: AddReportModalProps) {
  const [formData, setFormData] = useState<ReportFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: any = {};
    
    if (!formData.title.trim()) newErrors.title = 'Report title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.type) newErrors.type = 'Report type is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.format) newErrors.format = 'Format is required';
    if (formData.dataSource.length === 0) newErrors.dataSource = 'At least one data source is required';
    
    // Date validation
    if (!formData.dateRange.start) newErrors['dateRange.start'] = 'Start date is required';
    if (!formData.dateRange.end) newErrors['dateRange.end'] = 'End date is required';
    if (formData.dateRange.start && formData.dateRange.end && 
        new Date(formData.dateRange.start) > new Date(formData.dateRange.end)) {
      newErrors['dateRange.end'] = 'End date must be after start date';
    }

    // Scheduling validation
    if (formData.scheduling.isScheduled) {
      if (!formData.scheduling.scheduleTime) newErrors['scheduling.scheduleTime'] = 'Schedule time is required';
      if (formData.scheduling.autoEmail && !formData.scheduling.recipients) {
        newErrors['scheduling.recipients'] = 'Recipients are required for email scheduling';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await post('/api/admin/reports', formData);
      
      setFormData(initialFormData);
      setCurrentStep(1);
      onReportAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setErrors({});
    onClose();
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'SALES':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: <DollarSign className="h-3 w-3" />, label: 'Sales Report' };
      case 'INVENTORY':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Package className="h-3 w-3" />, label: 'Inventory Report' };
      case 'USERS':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Users className="h-3 w-3" />, label: 'Users Report' };
      case 'FINANCIAL':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <TrendingUp className="h-3 w-3" />, label: 'Financial Report' };
      case 'LOGISTICS':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Truck className="h-3 w-3" />, label: 'Logistics Report' };
      case 'PERFORMANCE':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: <BarChart3 className="h-3 w-3" />, label: 'Performance Report' };
      case 'CUSTOM':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Settings className="h-3 w-3" />, label: 'Custom Report' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileText className="h-3 w-3" />, label: type };
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const dataSourceOptions = [
    { value: 'orders', label: 'Orders & Transactions' },
    { value: 'products', label: 'Products & Inventory' },
    { value: 'users', label: 'Users & Accounts' },
    { value: 'merchants', label: 'Merchants & Businesses' },
    { value: 'logistics', label: 'Shipping & Logistics' },
    { value: 'analytics', label: 'Analytics & Metrics' },
    { value: 'financials', label: 'Financial Data' },
    { value: 'notifications', label: 'Notifications & Communications' }
  ];

  const chartTypeOptions = [
    { value: 'bar', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'line', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
    { value: 'pie', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
    { value: 'trend', label: 'Trend Analysis', icon: <TrendingUp className="h-4 w-4" /> }
  ];

  const roleOptions = [
    { value: 'admin', label: 'Administrators' },
    { value: 'merchant', label: 'Merchants' },
    { value: 'logistics', label: 'Logistics Staff' },
    { value: 'analyst', label: 'Data Analysts' },
    { value: 'executive', label: 'Executives' }
  ];

  const renderStep1 = () => (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#f8c017]" />
            Basic Information
          </CardTitle>
          <CardDescription className="text-gray-400">
            Define the report's basic properties and metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">Report Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              placeholder="Enter report title"
            />
            {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              placeholder="Enter report description"
              rows={3}
            />
            {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-300">Report Type *</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-600">
                  <SelectItem value="SALES">Sales Report</SelectItem>
                  <SelectItem value="INVENTORY">Inventory Report</SelectItem>
                  <SelectItem value="USERS">Users Report</SelectItem>
                  <SelectItem value="FINANCIAL">Financial Report</SelectItem>
                  <SelectItem value="LOGISTICS">Logistics Report</SelectItem>
                  <SelectItem value="PERFORMANCE">Performance Report</SelectItem>
                  <SelectItem value="CUSTOM">Custom Report</SelectItem>
                </SelectContent>
              </Select>
              {formData.type && (
                <Badge className={`${getTypeInfo(formData.type).color} border mt-2 flex items-center gap-1 w-fit`}>
                  {getTypeInfo(formData.type).icon}
                  {getTypeInfo(formData.type).label}
                </Badge>
              )}
              {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-gray-300">Category *</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-600">
                  <SelectItem value="DASHBOARD">Dashboard Report</SelectItem>
                  <SelectItem value="ANALYTICS">Analytics Report</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance Report</SelectItem>
                  <SelectItem value="OPERATIONAL">Operational Report</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive Summary</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-400 text-sm">{errors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format" className="text-gray-300">Output Format *</Label>
              <Select value={formData.format} onValueChange={(value: any) => setFormData(prev => ({ ...prev, format: value }))}>
                <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-600">
                  <SelectItem value="PDF">PDF Document</SelectItem>
                  <SelectItem value="CSV">CSV File</SelectItem>
                  <SelectItem value="EXCEL">Excel Spreadsheet</SelectItem>
                  <SelectItem value="JSON">JSON Data</SelectItem>
                </SelectContent>
              </Select>
              {errors.format && <p className="text-red-400 text-sm">{errors.format}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-gray-300">Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-600">
                  <SelectItem value="ONCE">One-time</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-[#f8c017]" />
            Data Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure data sources, date ranges, and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Data Sources *</Label>
            <div className="grid grid-cols-2 gap-2">
              {dataSourceOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={option.value}
                    checked={formData.dataSource.includes(option.value)}
                    onChange={(e) => {
                      const newDataSource = e.target.checked 
                        ? [...formData.dataSource, option.value]
                        : formData.dataSource.filter(item => item !== option.value);
                      setFormData(prev => ({ ...prev, dataSource: newDataSource }));
                    }}
                    className="rounded border-gray-600 bg-[#1a1a1a] text-[#f8c017] focus:ring-[#f8c017]"
                  />
                  <Label htmlFor={option.value} className="text-gray-300 text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.dataSource && <p className="text-red-400 text-sm">{errors.dataSource}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-gray-300">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.dateRange.start}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              />
              {errors['dateRange.start'] && <p className="text-red-400 text-sm">{errors['dateRange.start']}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-gray-300">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.dateRange.end}
                min={formData.dateRange.start || getMinDate()}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
              />
              {errors['dateRange.end'] && <p className="text-red-400 text-sm">{errors['dateRange.end']}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-gray-300 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Additional Filters
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeInactive"
                  checked={formData.filters.includeInactive}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    filters: { ...prev.filters, includeInactive: checked }
                  }))}
                />
                <Label htmlFor="includeInactive" className="text-gray-300 text-sm">
                  Include inactive records
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-gray-300">Region Filter</Label>
                  <Input
                    id="region"
                    value={formData.filters.region}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      filters: { ...prev.filters, region: e.target.value }
                    }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="e.g., North America, Europe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-gray-300">Department Filter</Label>
                  <Input
                    id="department"
                    value={formData.filters.department}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      filters: { ...prev.filters, department: e.target.value }
                    }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="e.g., Sales, Operations"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customFilters" className="text-gray-300">Custom Filters</Label>
                <Textarea
                  id="customFilters"
                  value={formData.filters.customFilters}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    filters: { ...prev.filters, customFilters: e.target.value }
                  }))}
                  className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter custom filter criteria"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      {/* Visualization Settings */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#f8c017]" />
            Visualization & Scheduling
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure charts and automated delivery options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="includeCharts"
                checked={formData.visualization.includeCharts}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  visualization: { ...prev.visualization, includeCharts: checked }
                }))}
              />
              <Label htmlFor="includeCharts" className="text-gray-300">
                Include charts and visualizations
              </Label>
            </div>

            {formData.visualization.includeCharts && (
              <div className="space-y-2">
                <Label className="text-gray-300">Chart Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {chartTypeOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`chart-${option.value}`}
                        checked={formData.visualization.chartTypes.includes(option.value)}
                        onChange={(e) => {
                          const newChartTypes = e.target.checked 
                            ? [...formData.visualization.chartTypes, option.value]
                            : formData.visualization.chartTypes.filter(item => item !== option.value);
                          setFormData(prev => ({
                            ...prev,
                            visualization: { ...prev.visualization, chartTypes: newChartTypes }
                          }));
                        }}
                        className="rounded border-gray-600 bg-[#1a1a1a] text-[#f8c017] focus:ring-[#f8c017]"
                      />
                      <Label htmlFor={`chart-${option.value}`} className="text-gray-300 text-sm flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="isScheduled"
                checked={formData.scheduling.isScheduled}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, isScheduled: checked }
                }))}
              />
              <Label htmlFor="isScheduled" className="text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule automated delivery
              </Label>
            </div>

            {formData.scheduling.isScheduled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime" className="text-gray-300">Schedule Time *</Label>
                  <Input
                    id="scheduleTime"
                    type="datetime-local"
                    value={formData.scheduling.scheduleTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scheduling: { ...prev.scheduling, scheduleTime: e.target.value }
                    }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  />
                  {errors['scheduling.scheduleTime'] && <p className="text-red-400 text-sm">{errors['scheduling.scheduleTime']}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoEmail"
                    checked={formData.scheduling.autoEmail}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      scheduling: { ...prev.scheduling, autoEmail: checked }
                    }))}
                  />
                  <Label htmlFor="autoEmail" className="text-gray-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email report automatically
                  </Label>
                </div>

                {formData.scheduling.autoEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="recipients" className="text-gray-300">Recipients *</Label>
                    <Textarea
                      id="recipients"
                      value={formData.scheduling.recipients}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        scheduling: { ...prev.scheduling, recipients: e.target.value }
                      }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter email addresses separated by commas"
                      rows={2}
                    />
                    {errors['scheduling.recipients'] && <p className="text-red-400 text-sm">{errors['scheduling.recipients']}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.permissions.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, isPublic: checked }
                }))}
              />
              <Label htmlFor="isPublic" className="text-gray-300">
                Make report publicly accessible
              </Label>
            </div>

            {!formData.permissions.isPublic && (
              <div className="space-y-2">
                <Label className="text-gray-300">Allowed Roles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${option.value}`}
                        checked={formData.permissions.allowedRoles.includes(option.value)}
                        onChange={(e) => {
                          const newRoles = e.target.checked 
                            ? [...formData.permissions.allowedRoles, option.value]
                            : formData.permissions.allowedRoles.filter(item => item !== option.value);
                          setFormData(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, allowedRoles: newRoles }
                          }));
                        }}
                        className="rounded border-gray-600 bg-[#1a1a1a] text-[#f8c017] focus:ring-[#f8c017]"
                      />
                      <Label htmlFor={`role-${option.value}`} className="text-gray-300 text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border border-[#f8c017]/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <FileText className="h-5 w-5 text-[#f8c017]" />
            </div>
            Create New Report
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Step {currentStep} of 3: Generate comprehensive reports with custom data and visualizations.
          </DialogDescription>
        </DialogHeader>

        {/* Step Navigation */}
        <div className="flex space-x-2 mb-6">
          {[1, 2, 3].map(step => (
            <div
              key={step}
              className={`flex-1 h-2 rounded ${
                step <= currentStep ? 'bg-[#f8c017]' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </form>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {currentStep > 1 && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="border-gray-600 text-gray-300 hover:border-gray-500"
              >
                Cancel
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}