"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Modal from "./Modal";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  merchant?: {
    businessName: string;
  };
}

interface Category {
  id: string;
  name: string;
  merchant?: {
    businessName: string;
  };
}

interface Merchant {
  id: string;
  businessName: string;
}

interface WarehouseDistribution {
  warehouseId: string;
  quantity: number;
  lowStockThreshold: number;
  minStockLevel?: number;
  maxStockLevel?: number;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
  const [formData, setFormData] = useState({
    merchantId: "",
    name: "",
    description: "",
    sku: "",
    categoryId: "",
    price: 0,
    cost: 0,
    weight: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
    trackInventory: true,
    allowBackorders: false,
    inventory: {
      trackInventory: true,
      stockQuantity: 0,
      lowStockThreshold: 5,
      allowBackorders: false,
    },
    images: [] as string[],
    status: "ACTIVE",
    tags: [] as string[],
    manufacturer: "",
    barcode: "",
  });
  
  const [warehouseDistribution, setWarehouseDistribution] = useState<WarehouseDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [initialMerchants, setInitialMerchants] = useState<Merchant[]>([]);
  const [merchantSearch, setMerchantSearch] = useState<string>("");
  const [debouncedMerchantSearch, setDebouncedMerchantSearch] = useState<string>("");
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [showMerchantDropdown, setShowMerchantDropdown] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const merchantDropdownRef = useRef<HTMLDivElement>(null);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (merchantDropdownRef.current && !merchantDropdownRef.current.contains(event.target as Node)) {
        setShowMerchantDropdown(false);
      }
    };

    if (showMerchantDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMerchantDropdown]);

  // debounce merchant search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMerchantSearch(merchantSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [merchantSearch]);

  useEffect(() => {
    // If there's a search term, perform search. If cleared, reload initial merchants list so
    // the select can be populated even when the user clears the query.
    if (debouncedMerchantSearch && debouncedMerchantSearch.length > 0) {
      searchMerchants(debouncedMerchantSearch);
    } else if (debouncedMerchantSearch === "") {
      // fetch initial merchants again (best-effort)
      (async () => {
        try {
          const res = await api.get("/api/merchants?limit=100");
          if (res.ok) {
            setMerchants(res.data.merchants || []);
            setInitialMerchants(res.data.merchants || []);
          }
        } catch (e) {
          console.warn("Failed to reload merchants after clearing search:", e);
        }
      })();
    }
  }, [debouncedMerchantSearch]);

  const searchMerchants = async (q: string) => {
    setMerchantLoading(true);
    setMerchantError(null);
    try {
      const res = await api.get(`/api/merchants?search=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const list = res.data.merchants || [];
        setMerchants(list);
        // keep initial snapshot if not already set
        if (!initialMerchants || initialMerchants.length === 0) setInitialMerchants(list);
        setMerchantLoading(false);
        return;
      }
      // if response not ok, fallthrough to local filtering below
      console.warn("Merchant search returned non-ok response:", res.error || res.status);
      setMerchantError(res.error || `HTTP ${res.status}`);
    } catch (err) {
      console.warn("Merchant search failed:", err);
      setMerchantError(err instanceof Error ? err.message : String(err));
    }

    // Fallback: case-insensitive client-side filter of initial merchants
    try {
      const ql = q.trim().toLowerCase();
      if (ql.length === 0) {
        setMerchants(initialMerchants || []);
      } else {
        const filtered = (initialMerchants || merchants || []).filter(m => (m.businessName || "").toLowerCase().includes(ql));
        setMerchants(filtered);
      }
    } finally {
      setMerchantLoading(false);
    }
  };

  useEffect(() => {
    if (formData.merchantId) {
      fetchMerchantData();
    }
  }, [formData.merchantId]);

  const fetchInitialData = async () => {
    setDataLoading(true);
    try {
      const [merchantsRes, categoriesRes] = await Promise.all([
        api.get("/api/merchants?limit=100"),
        api.get('/api/categories'),
      ]);

      if (merchantsRes.ok) {
        const merchantsList = merchantsRes.data.merchants || [];
        setMerchants(merchantsList);
        setInitialMerchants(merchantsList);
        console.log("Loaded merchants:", merchantsList.length);
      }
      if (categoriesRes && categoriesRes.ok) {
        setCategories(categoriesRes.data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("Failed to load initial data");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMerchantData = async () => {
    if (!formData.merchantId) {
      setWarehouses([]);
      return;
    }

    setWarehousesLoading(true);
    setWarehouses([]);
    
    try {
      console.log("Fetching ALL warehouses (admin can see all)");
      // Admin can see all warehouses regardless of merchant
      // Categories are global (not merchant-specific), already loaded in fetchInitialData
      const warehousesRes = await api.get(`/api/warehouse?pageSize=100`);

      console.log("Warehouses response:", warehousesRes);
      
      if (warehousesRes.ok) {
        // warehouse endpoint returns { warehouses, total, page, pageSize }
        const warehouseList = warehousesRes.data?.warehouses || [];
        console.log("Setting warehouses (all):", warehouseList.length, warehouseList);
        setWarehouses(warehouseList);
      } else {
        console.error("Warehouses fetch failed:", warehousesRes.error);
      }
    } catch (error) {
      console.error("Error fetching merchant data:", error);
      setError("Failed to load merchant data");
    } finally {
      setWarehousesLoading(false);
    }
  };

  // generate an SKU when missing
  const generateSku = (name: string, merchantId?: string) => {
    const base = (name || 'PROD')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 6) || 'PROD';
    const m = merchantId ? merchantId.replace(/[^A-Z0-9]+/gi, '').toUpperCase().slice(0,4) : 'MRC';
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${m}-${base}-${rand}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare warehouse distribution data
      const warehouses = warehouseDistribution.map(w => ({
        warehouseId: w.warehouseId,
        quantity: w.quantity,
        minStockLevel: w.minStockLevel || 0,
        maxStockLevel: w.maxStockLevel || 1000,
      }));

      // ensure SKU exists (generate if empty)
      const skuToUse = formData.sku && formData.sku.trim() ? formData.sku.trim() : generateSku(formData.name, formData.merchantId);

      const payload = {
        merchantId: formData.merchantId,
        name: formData.name,
        description: formData.description,
        sku: skuToUse,
        barcode: formData.barcode,
        categoryId: formData.categoryId,
        weight: formData.weight,
        weightUnit: "kg",
        dimensions: formData.dimensions,
        dimensionUnit: "cm",
        costPrice: formData.cost,
        sellingPrice: formData.price,
        images: formData.images,
        requiresShipping: true,
        isFragile: false,
        customFields: {
          manufacturer: formData.manufacturer,
          tags: formData.tags,
        },
        warehouses: warehouses,
      };

      // use api helper so auth headers and refresh flow are handled
      const response = await api.post('/api/products', payload);
      const data = response.data;

      if (response.ok) {
        const created = data.product;

        // If there are selected files, upload them to the product images endpoint
        if (selectedFiles && selectedFiles.length > 0 && created && created.id) {
          try {
            const fd = new FormData();
            selectedFiles.forEach((f) => fd.append("images", f));
            
            // Use fetch directly with Authorization header from authClient
            const accessToken = (await import("@/lib/auth-client")).authClient.getAccessToken();
            const imgRes = await fetch(`/api/products/${created.id}/images`, {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
              },
              body: fd,
            });
            
            if (imgRes.ok) {
              console.log("Images uploaded successfully");
            } else {
              console.warn("Failed to upload images for product", await imgRes.text());
            }
          } catch (err) {
            console.error("Image upload failed:", err);
          }
        }

        onSuccess();
        onClose();

        // Reset form
        setFormData({
          merchantId: "",
          name: "",
          description: "",
          sku: "",
          categoryId: "",
          price: 0,
          cost: 0,
          weight: 0,
          dimensions: {
            length: 0,
            width: 0,
            height: 0,
          },
          trackInventory: true,
          allowBackorders: false,
          inventory: {
            trackInventory: true,
            stockQuantity: 0,
            lowStockThreshold: 5,
            allowBackorders: false,
          },
          images: [],
          status: "ACTIVE",
          tags: [],
          manufacturer: "",
          barcode: "",
        });
        setWarehouseDistribution([]);
        // clear selected files and revoke previews
        selectedFiles.forEach((f) => {
          // nothing to revoke for File objects, revoke previews
        });
        previews.forEach((u) => URL.revokeObjectURL(u));
        setSelectedFiles([]);
        setPreviews([]);
      } else {
        setError(data.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Failed to create product:", error);
      setError("Failed to create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addImage = () => {
    // kept for backward compatibility if needed; prefer file uploads
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()]
      }));
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArr = Array.from(files);
    setSelectedFiles(fileArr);
    const urls = fileArr.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Product" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Basic Information</h4>
          {/* Merchant selector (required) with autocomplete */}
          <div className="relative" ref={merchantDropdownRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">Merchant *</label>
            <input 
              type="text"
              required
              value={merchantSearch} 
              onChange={(e) => {
                setMerchantSearch(e.target.value);
                setShowMerchantDropdown(true);
              }}
              onFocus={() => setShowMerchantDropdown(true)}
              placeholder="Type to search merchants..." 
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]" 
            />
            
            {showMerchantDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {merchantLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
                ) : merchants.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">No merchants found</div>
                ) : (
                  merchants.map((merchant) => (
                    <button
                      key={merchant.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, merchantId: merchant.id }));
                        setMerchantSearch(merchant.businessName);
                        setShowMerchantDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors ${
                        formData.merchantId === merchant.id ? 'bg-gray-800 text-[#f08c17]' : 'text-white'
                      }`}
                    >
                      {merchant.businessName}
                    </button>
                  ))
                )}
              </div>
            )}
            
            {formData.merchantId && (
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, merchantId: '' }));
                  setMerchantSearch('');
                  setMerchants(initialMerchants || []);
                }}
                className="absolute right-2 top-9 text-gray-400 hover:text-white"
              >
                ×
              </button>
            )}
            
            <p className="mt-1 text-xs text-gray-400">
              {formData.merchantId ? `Selected: ${merchants.find(m => m.id === formData.merchantId)?.businessName || 'Unknown'}` : 'Start typing to search'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Enter product name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Leave empty to auto-generate"
              />
              <p className="mt-1 text-xs text-gray-400">
                Optional. If not provided, a unique SKU will be generated automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              placeholder="Product description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Manufacturer name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Barcode</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Product barcode"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Costs */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Pricing & Costs</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sale Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cost Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Physical Properties */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Physical Properties</h4>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Weight (lbs)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Length (in)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dimensions.length}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, length: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Width (in)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dimensions.width}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, width: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Height (in)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dimensions.height}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, height: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Inventory Management */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Inventory Management</h4>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="trackInventory"
              checked={formData.inventory.trackInventory}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                inventory: { ...prev.inventory, trackInventory: e.target.checked }
              }))}
              className="mr-2 text-[#f08c17]"
            />
            <label htmlFor="trackInventory" className="text-gray-300">Track inventory for this product</label>
          </div>

          {formData.inventory.trackInventory && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.inventory.stockQuantity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, stockQuantity: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={formData.inventory.lowStockThreshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, lowStockThreshold: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="5"
                />
              </div>
              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="allowBackorders"
                  checked={formData.inventory.allowBackorders}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, allowBackorders: e.target.checked }
                  }))}
                  className="mr-2 text-[#f08c17]"
                />
                <label htmlFor="allowBackorders" className="text-gray-300">Allow backorders</label>
              </div>
            </div>
          )}

            {/* Warehouse distribution UI */}
            <div className="mt-4">
              <h5 className="text-gray-300 font-medium mb-2">Distribute stock across warehouses</h5>
              
              {warehousesLoading && (
                <div className="text-sm text-gray-400 mb-2">Loading warehouses...</div>
              )}
              
              {!warehousesLoading && warehouses.length === 0 && formData.merchantId && (
                <div className="text-sm text-yellow-400 mb-2">No warehouses found for this merchant. Please add warehouses first.</div>
              )}
              
              {!formData.merchantId && (
                <div className="text-sm text-gray-400 mb-2">Select a merchant first to load warehouses</div>
              )}
              
              <div className="space-y-2">
                {warehouseDistribution.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Warehouse</label>
                      <select
                        required
                        value={row.warehouseId}
                        onChange={(e) => setWarehouseDistribution(prev => prev.map((r, i) => i === idx ? { ...r, warehouseId: e.target.value } : r))}
                        className="w-full px-2 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                        disabled={warehousesLoading || warehouses.length === 0}
                      >
                        <option value="">Select warehouse</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={(e) => setWarehouseDistribution(prev => prev.map((r, i) => i === idx ? { ...r, quantity: parseInt(e.target.value || '0') } : r))}
                        className="w-full px-2 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min</label>
                      <input
                        type="number"
                        min={0}
                        value={row.minStockLevel || 0}
                        onChange={(e) => setWarehouseDistribution(prev => prev.map((r, i) => i === idx ? { ...r, minStockLevel: parseInt(e.target.value || '0') } : r))}
                        className="w-full px-2 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max</label>
                      <input
                        type="number"
                        min={0}
                        value={row.maxStockLevel || 0}
                        onChange={(e) => setWarehouseDistribution(prev => prev.map((r, i) => i === idx ? { ...r, maxStockLevel: parseInt(e.target.value || '0') } : r))}
                        className="w-full px-2 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      />
                    </div>
                    <div className="flex items-center">
                      <button type="button" onClick={() => setWarehouseDistribution(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  </div>
                ))}

                <div>
                  <button 
                    type="button" 
                    onClick={() => setWarehouseDistribution(prev => [...prev, { warehouseId: '', quantity: 0, lowStockThreshold: 0 }])} 
                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={warehousesLoading || warehouses.length === 0}
                  >
                    Add Distribution Row
                  </button>
                </div>

                <div className="text-sm text-gray-300">
                  <div>Total distributed: <span className="font-medium">{warehouseDistribution.reduce((s, r) => s + Number(r.quantity || 0), 0)}</span></div>
                  <div>Stock quantity: <span className="font-medium">{formData.inventory.stockQuantity}</span></div>
                  {warehouseDistribution.reduce((s, r) => s + Number(r.quantity || 0), 0) !== formData.inventory.stockQuantity && (
                    <div className="text-yellow-400">Warning: distributed quantity does not equal stock quantity. Ensure totals match before creating.</div>
                  )}
                </div>
              </div>
            </div>
        </div>

        {/* Images - use file selection and upload after product creation */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Product Images</h4>

          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="text-sm text-gray-300" />
          </div>
          <div className="text-sm text-gray-400">You can select multiple images. They'll be uploaded after the product is created.</div>

          {(previews.length > 0 || formData.images.length > 0) && (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, index) => (
                  <div key={`preview-${index}`} className="relative group">
                    <img src={src} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded border border-gray-600" />
                    <button type="button" onClick={() => removeSelectedFile(index)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}

                {formData.images.map((image, index) => (
                  <div key={`url-${index}`} className="relative group">
                    <img src={image} alt={`Product ${index + 1}`} className="w-full h-20 object-cover rounded border border-gray-600" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Tags</h4>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              placeholder="Enter tag name"
            />
            <button
              type="button"
              onClick={addTag}
              className="bg-[#f08c17] text-black px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors"
            >
              Add
            </button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-red-400 hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bulk import (admin) */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Bulk Import</h4>
          <div className="text-sm text-gray-400">Upload a JSON or CSV file with products to import. CSV should have a header row matching product field names (sku,name,price,costPrice,categoryId,barcode,description,...). Merchant must be selected.</div>
          <div className="flex items-center gap-2">
            <input type="file" accept=".json,.csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={async () => {
              if (!bulkFile) return setError('Select a file first');
              if (!formData.merchantId) return setError('Select merchant before bulk import');
              setBulkLoading(true); setBulkResult(null); setError(null);
              try {
                const text = await bulkFile.text();
                let products: any[] = [];
                if (bulkFile.name.toLowerCase().endsWith('.json')) {
                  products = JSON.parse(text);
                } else {
                  // simple CSV parse
                  const lines = text.split(/\r?\n/).filter(Boolean);
                  const header = lines[0].split(',').map(h => h.trim());
                  products = lines.slice(1).map(l => {
                    const cols = l.split(',');
                    const obj: any = {};
                    header.forEach((h, i) => { obj[h] = cols[i] ? cols[i].trim() : ''; });
                    // convert numeric fields
                    if (obj.price) obj.sellingPrice = parseFloat(obj.price);
                    if (obj.cost) obj.costPrice = parseFloat(obj.cost || obj.costPrice || 0);
                    return obj;
                  });
                }

                // POST to bulk-import endpoint
                const res = await api.post('/api/products/bulk-import', { merchantId: formData.merchantId, products });
                const resJson = res.data;
                setBulkResult(resJson);
                if (!res.ok) setError(res.error || 'Bulk import failed');
                else {
                  setBulkFile(null);
                }
              } catch (err) {
                console.error(err);
                setError('Bulk import failed');
              } finally {
                setBulkLoading(false);
              }
            }} className="bg-[#f08c17] px-3 py-1 rounded text-black">Import</button>
          </div>

          {bulkLoading && <div className="text-sm text-gray-300">Importing...</div>}
          {bulkResult && <pre className="text-xs text-gray-300 bg-black rounded p-2 mt-2">{JSON.stringify(bulkResult, null, 2)}</pre>}
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}