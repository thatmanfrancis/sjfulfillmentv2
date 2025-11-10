"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid"
import ReactDOM from 'react-dom';

interface Category {
  id: string;
  name: string;
  merchantId?: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [createForm, setCreateForm] = useState<CreateCategoryForm>({
    name: "",
    parentCategoryId: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [openActionFor, setOpenActionFor] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/categories", {
        name: createForm.name,
        parentCategoryId: createForm.parentCategoryId || null,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to create category");
      }

      setShowCreateModal(false);
      setCreateForm({ name: "", parentCategoryId: "" });
      setMessage('Category created');
      setMessageType('success');
      fetchCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create category";
      setError(msg);
      setMessage(msg);
      setMessageType('error');
    }
  };

  const openEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
    setOpenActionFor(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      const payload = { name: selectedCategory.name, parentCategoryId: selectedCategory.parentCategoryId || null };
      const response = await api.put(`/api/categories/${selectedCategory.id}`, payload);
      if (!response.ok) throw new Error(response.error || 'Failed to update category');
      setShowEditModal(false);
      setSelectedCategory(null);
      setMessage('Category updated');
      setMessageType('success');
      fetchCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update category';
      setError(msg);
      setMessage(msg);
      setMessageType('error');
    }
  };

  const openDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
    setOpenActionFor(null);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      const response = await api.delete(`/api/categories/${selectedCategory.id}`);
      if (!response.ok) throw new Error(response.error || 'Failed to delete category');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      setMessage('Category deleted');
      setMessageType('success');
      fetchCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category';
      setError(msg);
      setMessage(msg);
      setMessageType('error');
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

  const rootCategories = filteredCategories.filter(cat => !cat.parentCategoryId);
  const childCategories = filteredCategories.filter(cat => cat.parentCategoryId);

  const handleActionButtonClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setActionMenuPos({ x: rect.right + window.scrollX - 160, y: rect.bottom + window.scrollY + 6 });
    setOpenActionFor(openActionFor === id ? null : id);
  };

  // Card renderer (nice unified card styling)
  const renderCategoryCard = (category: Category) => {
    const hasChildren = category._count.childCategories > 0;
    const isExpanded = expandedCategories.has(category.id);
    const children = childCategories.filter(child => child.parentCategoryId === category.id);

    return (
      <div key={category.id} className="relative bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition">
        {/* action menu button top-right */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button onClick={(e) => handleActionButtonClick(e, category.id)} className="text-gray-300 hover:text-white p-1 rounded bg-transparent mt-6">
              <EllipsisVerticalIcon width={20} height={20} />
            </button>

            {openActionFor === category.id && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                <button onClick={() => openEdit(category)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white">Edit</button>
                <button onClick={() => openDelete(category)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400">Delete</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className="shrink-0 mt-1">
            <div className="h-10 w-10 rounded-md bg-linear-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3v6h8v-6h3a1 1 0 001-1V7" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                {category.parentCategory && <p className="text-sm text-gray-400">Parent: {category.parentCategory.name}</p>}
              </div>
              <div className="text-sm text-gray-300 text-right">
                <div className="font-medium text-white">{category._count.products} products</div>
                {hasChildren && <div className="text-gray-400">{category._count.childCategories} subcategories</div>}
              </div>
            </div>

            {hasChildren && (
              <div className="mt-3">
                <button onClick={() => toggleExpanded(category.id)} className="text-sm text-blue-400 hover:underline">
                  {isExpanded ? 'Hide subcategories' : `Show ${category._count.childCategories} subcategories`}
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-1">
                    {children.map(c => (
                      <div key={c.id} className="text-sm text-gray-300">- {c.name}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
            <div className="relative">
              <button onClick={(e) => handleActionButtonClick(e, category.id)} className="text-gray-400 hover:text-white p-1 rounded">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>

              {openActionFor === category.id && (
                <div ref={actionMenuRef} className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                  <button onClick={() => openEdit(category)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white">Edit</button>
                  <button onClick={() => openDelete(category)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400">Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-300 rounded-lg"></div>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-gray-400">Organize products into categories and subcategories</p>
        </div>
        {user?.role === "ADMIN" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
          >
            Add Category
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded ${messageType === 'success' ? 'bg-green-800 text-green-200 border border-green-700' : 'bg-red-900/20 text-red-300 border border-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
        />
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4 overflow-visible">
        {rootCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No categories found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rootCategories.map(category => renderCategoryCard(category))}
          </div>
        )}
      </div>

      {/* Portal-based action menu rendered at document.body to avoid clipping */}
      {openActionFor && actionMenuPos && (() => {
        const cat = categories.find(c => c.id === openActionFor);
        if (!cat) return null;
        return ReactDOM.createPortal(
          <div style={{ position: 'absolute', left: actionMenuPos.x, top: actionMenuPos.y, width: 160 }} className="bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
            <button onClick={() => { openEdit(cat); setOpenActionFor(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white">Edit</button>
            <button onClick={() => { openDelete(cat); setOpenActionFor(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400">Delete</button>
          </div>, document.body
        );
      })()}

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

      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Edit Category</h2>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Category Name</label>
                <input type="text" required value={selectedCategory.name} onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Parent Category (Optional)</label>
                <select value={selectedCategory.parentCategoryId || ""} onChange={(e) => setSelectedCategory({ ...selectedCategory, parentCategoryId: e.target.value || undefined })} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  <option value="">No Parent Category</option>
                  {rootCategories.filter(c => c.id !== selectedCategory.id).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedCategory(null); }} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white">Delete category?</h3>
            <p className="text-gray-300 mt-2">Are you sure you want to delete "{selectedCategory.name}"? This cannot be undone.</p>
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => { setShowDeleteModal(false); setSelectedCategory(null); }} className="px-4 py-2 text-gray-300">Cancel</button>
              <button onClick={handleDeleteCategory} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}