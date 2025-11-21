'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, Download, FileText, AlertTriangle, CheckCircle, 
  X, User, MapPin, Package, FileSpreadsheet, Loader2 
} from 'lucide-react';
import { post } from '@/lib/api';

interface BulkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrdersCreated: () => void;
}

interface ParsedOrderData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  businessName: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

interface OrderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationResult {
  valid: ParsedOrderData[];
  invalid: Array<{ data: ParsedOrderData; errors: string[] }>;
  totalItems: number;
  estimatedTotal: number;
}

export default function BulkOrderModal({ isOpen, onClose, onOrdersCreated }: BulkOrderModalProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ValidationResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Manual form state
  const [manualForm, setManualForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    businessName: '',
    items: [{ sku: '', quantity: 1 }]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setFile(uploadedFile);
      parseCSVFile(uploadedFile);
    } else {
      setValidationErrors(['Please select a valid CSV file.']);
    }
  };

  const parseCSVFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = result.data as any[];
      const expectedHeaders = ['customername', 'customerphone', 'customeraddress', 'businessname', 'productsku', 'quantity'];
      const actualHeaders = Object.keys(rows[0] || {}).map(h => h.toLowerCase());
      const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const parsedOrders: ParsedOrderData[] = [];
      const orderMap = new Map<string, ParsedOrderData>();
      for (const row of rows) {
        const customerName = (row.customerName || row.customername || '').trim();
        const customerPhone = (row.customerPhone || row.customerphone || '').trim();
        const customerAddress = (row.customerAddress || row.customeraddress || '').trim();
        const businessName = (row.businessName || row.businessname || '').trim();
        const sku = (row.productSku || row.productsku || '').trim();
        const quantity = parseInt(row.quantity) || 1;
        if (!customerName || !customerPhone || !customerAddress || !businessName || !sku) {
          continue;
        }
        const orderKey = `${customerName}-${customerPhone}-${businessName.toLowerCase()}`;
        if (orderMap.has(orderKey)) {
          const existingOrder = orderMap.get(orderKey)!;
          existingOrder.items.push({ sku: sku.toLowerCase(), quantity });
        } else {
          const newOrder: ParsedOrderData = {
            customerName,
            customerPhone,
            customerAddress,
            businessName,
            items: [{ sku: sku.toLowerCase(), quantity }]
          };
          orderMap.set(orderKey, newOrder);
          parsedOrders.push(newOrder);
        }
      }
      await validateOrders(parsedOrders);
      
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to parse CSV file']);
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const validateOrders = async (orders: ParsedOrderData[]) => {
    try {
      setLoading(true);
      const response = await post('/api/admin/orders/validate-bulk', { orders }) as any;
      
      if (response.success) {
        setParsedData(response.validation);
        setValidationErrors([]);
      } else {
        setValidationErrors([response.error || 'Validation failed']);
        setParsedData(null);
      }
    } catch (error) {
      setValidationErrors(['Failed to validate orders. Please try again.']);
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedData || parsedData.valid.length === 0) {
      setValidationErrors(['No valid orders to upload']);
      return;
    }

    try {
      setUploading(true);
      const response = await post('/api/admin/orders/bulk-create', { 
        orders: parsedData.valid 
      }) as any;
      
      if (response.success) {
        onOrdersCreated();
        onClose();
        resetForm();
      } else {
        setValidationErrors([response.error || 'Failed to create orders']);
      }
    } catch (error) {
      setValidationErrors(['Failed to create orders. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualForm.customerName || !manualForm.customerPhone || !manualForm.customerAddress || 
        !manualForm.businessName || manualForm.items.some(item => !item.sku || item.quantity < 1)) {
      setValidationErrors(['Please fill in all required fields']);
      return;
    }

    try {
      setUploading(true);
      const orderData = {
        ...manualForm,
        items: manualForm.items.filter(item => item.sku && item.quantity > 0)
      };

      const response = await post('/api/admin/orders/create', orderData) as any;
      
      if (response.success) {
        onOrdersCreated();
        onClose();
        resetForm();
      } else {
        setValidationErrors([response.error || 'Failed to create order']);
      }
    } catch (error) {
      setValidationErrors(['Failed to create order. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData(null);
    setValidationErrors([]);
    setManualForm({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      businessName: '',
      items: [{ sku: '', quantity: 1 }]
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addManualItem = () => {
    setManualForm(prev => ({
      ...prev,
      items: [...prev.items, { sku: '', quantity: 1 }]
    }));
  };

  const removeManualItem = (index: number) => {
    setManualForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateManualItem = (index: number, field: 'sku' | 'quantity', value: string | number) => {
    setManualForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const downloadTemplate = () => {
    // Download the dynamic template with real products from the server
    const link = document.createElement('a');
    link.href = '/api/admin/orders/template/dynamic';
    link.download = 'bulk-orders-template-with-real-products.csv';
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Add Orders</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create orders manually or upload a CSV file for bulk order creation
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a]">
            <TabsTrigger value="manual" className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
              CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-[#2a2a2a] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-[#f8c017]" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName" className="text-gray-300">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={manualForm.customerName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, customerName: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className="text-gray-300">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      value={manualForm.customerPhone}
                      onChange={(e) => setManualForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerAddress" className="text-gray-300">Delivery Address *</Label>
                  <Textarea
                    id="customerAddress"
                    value={manualForm.customerAddress}
                    onChange={(e) => setManualForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                    placeholder="Enter full delivery address"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="businessName" className="text-gray-300">Business/Merchant *</Label>
                  <Input
                    id="businessName"
                    value={manualForm.businessName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, businessName: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                    placeholder="Enter business name"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#2a2a2a] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#f8c017]" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {manualForm.items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label className="text-gray-300">Product SKU *</Label>
                      <Input
                        value={item.sku}
                        onChange={(e) => updateManualItem(index, 'sku', e.target.value)}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                        placeholder="Enter product SKU"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-gray-300">Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateManualItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                      />
                    </div>
                    {manualForm.items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeManualItem(index)}
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addManualItem}
                  className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017] hover:text-black"
                >
                  Add Item
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card className="bg-[#2a2a2a] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[#f8c017]" />
                  CSV File Upload
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a CSV file containing order data. Download the template to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017] hover:text-black"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <div className="text-sm text-gray-400">
                    Required columns: customerName, customerPhone, customerAddress, businessName, productSku, quantity
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 text-[#f8c017] mx-auto" />
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-400 text-sm">File uploaded successfully</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-gray-600 text-gray-300"
                      >
                        Choose Different File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-gray-300">Click to upload CSV file</p>
                      <p className="text-gray-500 text-sm">or drag and drop your file here</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017] hover:text-black"
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {loading && (
              <Card className="bg-[#2a2a2a] border-gray-700">
                <CardContent className="p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#f8c017] mx-auto mb-2" />
                  <p className="text-white">Processing CSV file...</p>
                </CardContent>
              </Card>
            )}


            {parsedData && (
              <div className="mt-8 bg-card rounded-2xl shadow-lg p-8 border border-border">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8">
                  <div className="flex flex-col items-center">
                    <span className="text-green-500 font-extrabold text-3xl drop-shadow">{parsedData.valid.length}</span>
                    <span className="text-muted-foreground text-base mt-1">Valid Orders</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-red-500 font-extrabold text-3xl drop-shadow">{parsedData.invalid.length}</span>
                    <span className="text-muted-foreground text-base mt-1">Invalid Orders</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-blue-500 font-extrabold text-3xl drop-shadow">{parsedData.totalItems}</span>
                    <span className="text-muted-foreground text-base mt-1">Total Items</span>
                  </div>
                </div>
                {/* Order Details Table */}
                <div className="overflow-x-auto rounded-xl border border-border bg-background">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedData.valid.map((order: any, idx: number) => (
                        <tr key={idx} className="hover:bg-accent transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{order.customerName}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.customerPhone}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{order.customerAddress}</td>
                          <td className="px-4 py-3">
                            <div className="mb-1 text-xs text-muted-foreground">
                              <span className="font-semibold">{order.items.length}</span> product{order.items.length !== 1 ? 's' : ''} / 
                              <span className="font-semibold">{order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span> total
                            </div>
                            <ul className="space-y-1">
                              {order.items.map((item: any, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="font-mono text-yellow-400 bg-yellow-900/20 rounded px-2 py-0.5 text-xs">{item.sku}</span>
                                  <span className="font-bold text-foreground">x{item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {validationErrors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium">Validation Errors</h4>
                <ul className="text-red-300 text-sm mt-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300"
            disabled={uploading}
          >
            Cancel
          </Button>
          {activeTab === 'manual' ? (
            <Button
              onClick={handleManualSubmit}
              disabled={uploading}
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Order
            </Button>
          ) : (
            <Button
              onClick={handleBulkUpload}
              disabled={uploading || !parsedData || parsedData.valid.length === 0}
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload {parsedData?.valid.length || 0} Orders
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}