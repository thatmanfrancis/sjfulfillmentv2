"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  merchantId: string;
  parentCategoryId?: string;
  parentCategory?: {
    id: string;
    name: string;
  };
  childCategories: {
    id: string;
    name: string;
  }[];
  _count: {
    products: number;
    childCategories: number;
  };
  createdAt: string;
}

interface CreateCategoryForm {
  name: string;
  merchantId: string;
  parentCategoryId?: string;
}

interface Merchant {
  id: string;
  businessName: string;
  contactEmail: string;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [createForm, setCreateForm] = useState<CreateCategoryForm>({
    name: "",
    merchantId: "",
    parentCategoryId: "",
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/categories");
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch categories");
      }
      const data = response.data;
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchants = async () => {
    try {
      const response = await api.get("/api/merchants");
      if (response.ok) {
        const data = response.data;
        setMerchants(data.merchants || []);
      }
    } catch (err) {
      console.error("Failed to load merchants:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (user?.role === "ADMIN") {
      fetchMerchants();
    }
  }, [user]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/categories", {
        ...createForm,
        parentCategoryId: createForm.parentCategoryId || null,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to create category");
      }

      setShowCreateModal(false);
      setCreateForm({ name: "", merchantId: "", parentCategoryId: "" });
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group categories by parent
  const rootCategories = filteredCategories.filter(cat => !cat.parentCategoryId);
  const childCategories = filteredCategories.filter(cat => cat.parentCategoryId);

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category._count.childCategories > 0;
    const isExpanded = expandedCategories.has(category.id);
    const children = childCategories.filter(child => child.parentCategoryId === category.id);

    return (
      <div key={category.id} className="border-b border-gray-700 last:border-b-0">
        <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-800 transition-colors">
          <div className="flex items-center space-x-3" style={{ marginLeft: `${level * 24}px` }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="text-gray-400 hover:text-white"
              >
                {isExpanded ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )}
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div>
                <h3 className="text-white font-medium">{category.name}</h3>
                {category.parentCategory && (
                  <p className="text-gray-400 text-sm">
                    Parent: {category.parentCategory.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-white font-medium">{category._count.products} products</div>
              {hasChildren && (
                <div className="text-gray-400 text-sm">{category._count.childCategories} subcategories</div>
              )}
            </div>
            <button className="text-gray-400 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Render children if expanded */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-gray-400">Organize products into categories and subcategories</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
        >
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
        />
      </div>

      {/* Categories List */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        {rootCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No categories found
          </div>
        ) : (
          <div>
            {rootCategories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create Category</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Merchant
                </label>
                <select
                  required
                  value={createForm.merchantId}
                  onChange={(e) => setCreateForm({ ...createForm, merchantId: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Merchant</option>
                  {merchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.businessName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={createForm.parentCategoryId}
                  onChange={(e) => setCreateForm({ ...createForm, parentCategoryId: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Parent Category</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}