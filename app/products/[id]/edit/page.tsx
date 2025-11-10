"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

interface ProductEditForm {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  costPrice: string;
  sellingPrice: string;
  weight: string;
  weightUnit: string;
  barcode: string;
  requiresShipping: boolean;
  isFragile: boolean;
  status: string;
  images: string[];
}

interface Category {
  id: string;
  name: string;
}

export default function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductEditForm>({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    costPrice: "",
    sellingPrice: "",
    weight: "",
    weightUnit: "kg",
    barcode: "",
    requiresShipping: true,
    isFragile: false,
    status: "ACTIVE",
    images: [],
  });

  useEffect(() => {
    params.then((resolvedParams) => {
      setProductId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchCategories();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ product: any }>(`/api/products/${productId}`);
      
      if (response.data?.product) {
        const p = response.data.product;
        setForm({
          name: p.name || "",
          sku: p.sku || "",
          description: p.description || "",
          categoryId: p.categoryId || "",
          costPrice: p.costPrice?.toString() || "",
          sellingPrice: p.sellingPrice?.toString() || "",
          weight: p.weight?.toString() || "",
          weightUnit: p.weightUnit || "kg",
          barcode: p.barcode || "",
          requiresShipping: p.requiresShipping ?? true,
          isFragile: p.isFragile ?? false,
          status: p.status || "ACTIVE",
          images: Array.isArray(p.images) ? p.images : [],
        });
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      alert("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<{ categories: Category[] }>("/api/categories");
      setCategories(response.data?.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "ml_default");

        const token = await authClient.getAccessToken();
        const response = await fetch(
          "https://api.cloudinary.com/v1_1/dryegp5hs/image/upload",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.secure_url);
        }
      }

      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      alert("Product name is required");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/products/${productId}`, {
        name: form.name,
        sku: form.sku,
        description: form.description || null,
        categoryId: form.categoryId || null,
        costPrice: parseFloat(form.costPrice) || undefined,
        sellingPrice: parseFloat(form.sellingPrice) || undefined,
        weight: parseFloat(form.weight) || undefined,
        weightUnit: form.weightUnit || null,
        barcode: form.barcode || null,
        requiresShipping: form.requiresShipping,
        isFragile: form.isFragile,
        status: form.status,
        images: form.images,
      });

      alert("Product updated successfully!");
      router.push(`/products/${productId}`);
    } catch (error: any) {
      console.error("Save error:", error);
      alert(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-[#f08c17] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/products/${productId}`)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Edit Product</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cost Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Selling Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Shipping</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Weight</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Weight Unit</label>
                <select
                  value={form.weightUnit}
                  onChange={(e) => setForm({ ...form, weightUnit: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="oz">Ounces (oz)</option>
                </select>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiresShipping}
                    onChange={(e) => setForm({ ...form, requiresShipping: e.target.checked })}
                    className="w-4 h-4 text-[#f08c17] bg-gray-800 border-gray-700 rounded focus:ring-[#f08c17]"
                  />
                  <span className="text-sm text-gray-300">Requires Shipping</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFragile}
                    onChange={(e) => setForm({ ...form, isFragile: e.target.checked })}
                    className="w-4 h-4 text-[#f08c17] bg-gray-800 border-gray-700 rounded focus:ring-[#f08c17]"
                  />
                  <span className="text-sm text-gray-300">Fragile</span>
                </label>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Product Images</h2>
            
            <div className="mb-4">
              <label className="block">
                <span className="sr-only">Choose images</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#f08c17] file:text-white hover:file:bg-orange-600 file:cursor-pointer cursor-pointer"
                />
              </label>
              {uploadingImages && (
                <p className="text-sm text-gray-400 mt-2">Uploading images...</p>
              )}
            </div>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {form.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push(`/products/${productId}`)}
              disabled={saving}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImages}
              className="px-6 py-2 bg-[#f08c17] text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
