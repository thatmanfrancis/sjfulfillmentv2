"use client";

import { useState, useEffect } from "react";
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.merchantId) {
      fetchMerchantData();
    }
  }, [formData.merchantId]);

  const fetchInitialData = async () => {
    setDataLoading(true);
    try {
      const [merchantsRes] = await Promise.all([
        api.get("/api/merchants?limit=100"),
      ]);

      if (merchantsRes.ok) {
        setMerchants(merchantsRes.data.merchants || []);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("Failed to load initial data");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMerchantData = async () => {
    if (!formData.merchantId) return;

    try {
      const [warehousesRes, categoriesRes] = await Promise.all([
        api.get(`/api/warehouse?merchantId=${formData.merchantId}`),
        api.get(`/api/categories?merchantId=${formData.merchantId}`),
      ]);

      if (warehousesRes.ok) {
        setWarehouses(warehousesRes.data.warehouses || []);
      }

      if (categoriesRes.ok) {
        setCategories(categoriesRes.data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching merchant data:", error);
      setError("Failed to load merchant data");
    }
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

      const payload = {
        merchantId: formData.merchantId,
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
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

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
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
              <label className="block text-sm font-medium text-gray-300 mb-2">SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Product SKU"
              />
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
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="books">Books</option>
                <option value="home">Home & Garden</option>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
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
        </div>

        {/* Images */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Product Images</h4>
          
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              placeholder="Enter image URL"
            />
            <button
              type="button"
              onClick={addImage}
              className="bg-[#f08c17] text-black px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors"
            >
              Add
            </button>
          </div>

          {formData.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-20 object-cover rounded border border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
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