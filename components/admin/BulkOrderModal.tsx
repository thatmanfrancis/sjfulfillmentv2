'use client';

import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
  items: Array<{ sku: string; quantity: number }>;
  amount?: number;
  cost?: number;
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
  // Merchant search state
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  // Restore missing validateOrders function
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
  // Restore missing state and handlers
  const [activeTab, setActiveTab] = useState<string>('manual');
  // Restore missing parseCSVFile and resetForm
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
        const amount = row.amount !== undefined ? Number(row.amount) : (row.Amount !== undefined ? Number(row.Amount) : undefined);
        const cost = row.cost !== undefined ? Number(row.cost) : (row.Cost !== undefined ? Number(row.Cost) : undefined);
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
            items: [{ sku: sku.toLowerCase(), quantity }],
            ...(amount ? { amount } : {}),
            ...(cost ? { cost } : {})
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

  const resetForm = () => {
    setFile(null);
    setParsedData(null);
    setValidationErrors([]);
    setManualForm({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      businessName: '',
      amount: '',
      cost: '',
      items: [],
      note: ''
    });
    setSelectedProducts([]);
    setProductSearchInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ValidationResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // --- State for Merchant/Product Select ---
  const [merchants, setMerchants] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    businessName: '',
    amount: '',
    cost: '',
    items: [] as Array<{ sku: string; quantity: number }>,
    note: '',
  });
  const [businessCurrency, setBusinessCurrency] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productSearchInput, setProductSearchInput] = useState('');
  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchInput(e.target.value);
  };
  const filteredProducts = products.filter(p => {
    const search = productSearchInput.toLowerCase();
    return p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
  });

  // Add/remove products from selectedProducts
  const toggleProductSelection = (product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.sku === product.sku);
      if (exists) {
        // Remove
        const updated = prev.filter(p => p.sku !== product.sku);
        setManualForm(form => ({
          ...form,
          items: form.items.filter(item => item.sku !== product.sku)
        }));
        return updated;
      } else {
        // Add only if not already present in manualForm.items
        setManualForm(form => {
          if (form.items.some(item => item.sku === product.sku)) {
            return form;
          }
          return {
            ...form,
            items: [...form.items, { sku: product.sku, quantity: 1 }]
          };
        });
        return [...prev, product];
      }
    });
  };

  // Update quantity for a selected product
  const updateProductQuantity = (sku: string, quantity: number) => {
    setManualForm(form => ({
      ...form,
      items: form.items.map(item =>
        item.sku === sku ? { ...item, quantity } : item
      )
    }));
  };

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setFile(uploadedFile);
      parseCSVFile(uploadedFile);
    } else {
      setValidationErrors(['Please select a valid CSV file.']);
    }
  };

  // Download template handler
  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/api/admin/orders/template/dynamic';
    link.download = 'bulk-orders-template-with-real-products.csv';
    link.click();
  };

  // Manual submit handler
  const handleManualSubmit = async () => {
    if (!manualForm.customerName || !manualForm.customerPhone || !manualForm.customerAddress ||
      !manualForm.businessName || manualForm.items.some(item => !item.sku || item.quantity < 1)) {
      setValidationErrors(['Please fill in all required fields']);
      return;
    }
    if (manualForm.amount && isNaN(Number(manualForm.amount))) {
      setValidationErrors(['Amount must be a valid number']);
      return;
    }
    try {
      setUploading(true);
      // Ensure only unique products in items
      const uniqueItems = manualForm.items.reduce((acc, item) => {
        if (!acc.some(i => i.sku === item.sku)) {
          acc.push(item);
        }
        return acc;
      }, [] as Array<{ sku: string; quantity: number }>);
      const orderData = {
        ...manualForm,
        amount: manualForm.amount ? Number(manualForm.amount) : undefined,
        cost: manualForm.cost ? Number(manualForm.cost) : undefined,
        items: uniqueItems.filter(item => item.sku && item.quantity > 0),
        note: manualForm.note || ''
      };
              <div>
                <Label htmlFor="note">Order Note</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note for this order (optional)"
                  value={manualForm.note}
                  onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
      console.log('Manual Order Upload - Frontend Sent:', orderData);
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

  // Bulk upload handler
  const handleBulkUpload = async () => {
    if (!parsedData || parsedData.valid.length === 0) {
      setValidationErrors(['No valid orders to upload']);
      return;
    }
    try {
      setUploading(true);
      const response = await post('/api/admin/orders/bulk-create', { orders: parsedData.valid }) as any;
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

 
  useEffect(() => {
    if (merchantSearch.length === 0) {
      setMerchants([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/admin/businesses?search=${encodeURIComponent(merchantSearch)}&limit=10`)
        .then(res => res.json())
        .then(data => setMerchants(data.businesses || []));
    }, 300);
    return () => clearTimeout(timeout);
  }, [merchantSearch]);

  // Fetch products for selected merchant
  useEffect(() => {
    if (!selectedMerchant) {
      setProducts([]);
      setBusinessCurrency('');
      setManualForm(prev => ({ ...prev, businessName: '' }));
      return;
    }
    setManualForm(prev => ({ ...prev, businessName: selectedMerchant.name }));
    setBusinessCurrency(selectedMerchant.baseCurrency || '');
    fetch(`/api/admin/products?merchantId=${selectedMerchant.id}`)
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
  }, [selectedMerchant]);

  // --- Existing logic for CSV/manual ---
  // ...existing code...

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
            <div>
              <Label htmlFor="businessName" className="text-gray-300">Business/Merchant *</Label>
              <div className="w-full relative">
                <Input
                  id="merchantSearch"
                  value={selectedMerchant ? selectedMerchant.name : merchantSearch}
                  onChange={e => {
                    setMerchantSearch(e.target.value);
                    setSelectedMerchant(null);
                    setBusinessCurrency('');
                    setMerchantDropdownOpen(true);
                  }}
                  onFocus={() => setMerchantDropdownOpen(true)}
                  className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] w-full"
                  placeholder="Search merchant by name"
                  autoComplete="off"
                />
                {merchantDropdownOpen && merchants.length > 0 && !selectedMerchant && (
                  <div className="absolute left-0 mt-1 w-full z-50 bg-[#232323] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    {merchants.map(m => (
                      <div
                        key={m.id}
                        onMouseDown={() => {
                          setSelectedMerchant(m);
                          setMerchantSearch(m.name);
                          setBusinessCurrency(m.baseCurrency || '');
                          setMerchantDropdownOpen(false);
                        }}
                        className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-[#333]"
                      >
                        <span className="truncate max-w-[200px]">{m.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{m.baseCurrency}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedMerchant && businessCurrency && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold bg-[#232323] px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">{businessCurrency}</span>
                )}
              </div>
            </div>
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
                  <Label htmlFor="note" className="text-gray-300">Order Note</Label>
                  <Textarea
                    id="note"
                    value={manualForm.note}
                    onChange={(e) => setManualForm(prev => ({ ...prev, note: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                    placeholder="Add a note for this order (optional)"
                    rows={2}
                  />
                </div>
                {/* <div>
                    <Label htmlFor="businessName" className="text-gray-300">Business/Merchant *</Label>
                    <div className="w-full relative">
                      <Input
                        id="merchantSearch"
                        value={selectedMerchant ? selectedMerchant.name : merchantSearch}
                        onChange={e => {
                          setMerchantSearch(e.target.value);
                          setSelectedMerchant(null);
                          setBusinessCurrency('');
                          setMerchantDropdownOpen(true);
                        }}
                        onFocus={() => setMerchantDropdownOpen(true)}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] w-full"
                        placeholder="Search merchant by name"
                        autoComplete="off"
                      />
                      {merchantDropdownOpen && merchants.length > 0 && !selectedMerchant && (
                        <div className="absolute left-0 mt-1 w-full z-50 bg-[#232323] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                          {merchants.map(m => (
                            <div
                              key={m.id}
                              onMouseDown={() => {
                                setSelectedMerchant(m);
                                setMerchantSearch(m.name);
                                setBusinessCurrency(m.baseCurrency || '');
                                setMerchantDropdownOpen(false);
                              }}
                              className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-[#333]"
                            >
                              <span className="truncate max-w-[200px]">{m.name}</span>
                              <span className="ml-2 text-xs text-gray-400">{m.baseCurrency}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedMerchant && businessCurrency && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold bg-[#232323] px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">{businessCurrency}</span>
                      )}
                    </div>
                </div> */}
                <div>
                  <Label htmlFor="amount" className="text-gray-300">Amount ({businessCurrency || 'Currency'})</Label>
                  <div className="flex items-center gap-2 mb-2">
                    {businessCurrency && <span className="text-gray-400 font-bold">{businessCurrency}</span>}
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                      placeholder="Enter order amount"
                    />
                  </div>
                  <Label htmlFor="cost" className="text-gray-300">Cost ({businessCurrency || 'Currency'})</Label>
                  <div className="flex items-center gap-2">
                    {businessCurrency && <span className="text-gray-400 font-bold">{businessCurrency}</span>}
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      value={manualForm.cost}
                      onChange={(e) => setManualForm(prev => ({ ...prev, cost: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                      placeholder="Enter order cost"
                    />
                  </div>
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
                <Label className="text-gray-300">Select Products *</Label>
                <div className="w-full relative mb-2">
                  <Input
                    value={productSearchInput}
                    onChange={handleProductSearch}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] w-full"
                    placeholder="Search products by name or SKU"
                    autoComplete="off"
                  />
                  {productSearchInput.length > 0 && filteredProducts.length > 0 && (
                    <div className="absolute left-0 mt-1 w-full z-50 bg-[#232323] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.map(p => {
                        const selected = selectedProducts.some(sp => sp.sku === p.sku);
                        return (
                          <div
                            key={p.sku}
                            onMouseDown={() => toggleProductSelection(p)}
                            className={`flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-[#333] ${selected ? 'bg-[#333]' : ''}`}
                          >
                            <span className="truncate max-w-[200px]">{p.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{p.sku}</span>
                            <span className={`ml-2 text-xs ${selected ? 'text-green-400' : 'text-gray-400'}`}>{selected ? 'Selected' : 'Select'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedProducts.length === 0 && (
                  <div className="text-gray-400 text-sm">No products selected. Search and select products above.</div>
                )}
                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    {selectedProducts.map((p, idx) => {
                      const item = manualForm.items.find(i => i.sku === p.sku);
                      return (
                        <div key={p.sku} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <span className="font-semibold text-white">{p.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{p.sku}</span>
                          </div>
                          <div className="w-24">
                            <Label className="text-gray-300">Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item?.quantity || 1}
                              onChange={e => updateProductQuantity(p.sku, parseInt(e.target.value) || 1)}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017]"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductSelection(p)}
                            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <div className="mb-4">
                  <Label className="text-gray-300">Select Merchant *</Label>
                  <div className="w-full relative">
                    <Input
                      id="bulkMerchantSearch"
                      value={selectedMerchant ? selectedMerchant.name : merchantSearch}
                      onChange={e => {
                        setMerchantSearch(e.target.value);
                        setSelectedMerchant(null);
                        setBusinessCurrency('');
                        setMerchantDropdownOpen(true);
                      }}
                      onFocus={() => setMerchantDropdownOpen(true)}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] w-full"
                      placeholder="Search merchant by name"
                      autoComplete="off"
                    />
                    {merchantDropdownOpen && merchants.length > 0 && !selectedMerchant && (
                      <div className="absolute left-0 mt-1 w-full z-50 bg-[#232323] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                        {merchants.map(m => (
                          <div
                            key={m.id}
                            onMouseDown={() => {
                              setSelectedMerchant(m);
                              setMerchantSearch(m.name);
                              setBusinessCurrency(m.baseCurrency || '');
                              setMerchantDropdownOpen(false);
                            }}
                            className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-[#333]"
                          >
                            <span className="truncate max-w-[200px]">{m.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{m.baseCurrency}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedMerchant && businessCurrency && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold bg-[#232323] px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">{businessCurrency}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017] hover:text-black"
                    disabled={!selectedMerchant}
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
                    disabled={!selectedMerchant}
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
                        disabled={!selectedMerchant}
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground tracking-wider">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedData.valid.map((order: any, idx: number) => (
                        <tr key={idx} className="hover:bg-accent transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{order.customerName}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.customerPhone}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{order.customerAddress}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.amount !== undefined ? order.amount : '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.cost !== undefined ? order.cost : '-'}</td>
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