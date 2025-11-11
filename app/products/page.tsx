"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRBAC } from "@/lib/use-rbac";
import Pagination from "@/components/Pagination";
import CreateProductModal from "@/components/CreateProductModal";
import BulkUploadProductsModal from "@/components/BulkUploadProductsModal";

interface InventoryLocation {
  id: string;
  warehouse: string;
  warehouseName: string;
  warehouseLocation: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  createdAt: string;
  images?: string[];
  inventoryLocations?: InventoryLocation[];
  inventory?: Array<{
    id: string;
    quantityAvailable: number;
    quantityReserved: number;
    quantityIncoming: number;
    warehouse: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { checkPermission, isMerchant, isMerchantStaff } = useRBAC();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreateProducts = checkPermission('products', 'create');
  const canEditProducts = checkPermission('products', 'update');
  const canViewInventory = checkPermission('inventory', 'read');

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        category: categoryFilter,
      });

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data: ProductsResponse = await response.json();
        
        console.log("Products API response:", data);
        
        // Transform API response to match frontend Product interface
        const productsWithLocations = (data.products || []).map(product => {
          // Calculate total stock from inventory
          const totalStock = (product.inventory || []).reduce(
            (sum, inv) => sum + (inv.quantityAvailable - inv.quantityReserved),
            0
          );
          
          return {
            ...product,
            // @ts-ignore - API returns category object, but we need string for display
            category: product.category?.name || 'Uncategorized',
            // @ts-ignore - API returns sellingPrice
            price: product.sellingPrice || 0,
            stock: totalStock,
            inventoryLocations: (product.inventory || []).map(inv => ({
              id: inv.id,
              warehouse: inv.warehouse.name,
              warehouseName: inv.warehouse.name,
              warehouseLocation: `${inv.warehouse.name}, Nigeria`,
              quantity: inv.quantityAvailable,
              reserved: inv.quantityReserved,
              available: inv.quantityAvailable - inv.quantityReserved,
              lastUpdated: new Date().toISOString(),
            }))
          };
        });

        setProducts(productsWithLocations);
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        console.error("Failed to fetch products:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "out_of_stock": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-400";
    if (stock < 10) return "text-yellow-400";
    return "text-green-400";
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setProductToDelete(null);
        fetchProducts(); // Refresh the list
      } else {
        console.error("Failed to delete product");
        alert("Failed to delete product");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleViewProduct = (productId: string) => {
    window.location.href = `/products/${productId}`;
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user?.role === "MERCHANT" ? "My Products" : "Products"}
          </h1>
          <p className="text-gray-400">Manage your product catalog</p>
        </div>
        {user?.role !== "MERCHANT" && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowBulkUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              📤 Bulk Upload
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
            >
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="home">Home & Garden</option>
          <option value="books">Books</option>
          <option value="sports">Sports</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Stock
                </th>
                {user?.role === "MERCHANT" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Locations
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === "MERCHANT" ? 9 : 8} className="px-6 py-12 text-center text-gray-400">
                    {loading ? "Loading products..." : "No products found"}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No img</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300 capitalize">{product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getStockColor(product.stock)}`}>
                        {product.stock} units
                      </div>
                    </td>
                    {user?.role === "MERCHANT" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-300 space-y-1">
                          {(product.inventoryLocations || []).map((location, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-400">{location.warehouse.split(' ')[0]}:</span>
                              <span className="text-blue-400">{location.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {product.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewProduct(product.id)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View
                        </button>
                        {user?.role !== "MERCHANT" && (
                          <>
                            <button 
                              onClick={() => handleViewProduct(product.id)}
                              className="text-[#f08c17] hover:text-orange-500 transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                setProductToDelete(product);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalCount}
        onPageChange={handlePageChange}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">{totalCount}</div>
          <div className="text-sm text-gray-400">Total Products</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {products.filter(p => p.status === "active").length}
          </div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            {products.filter(p => p.stock === 0).length}
          </div>
          <div className="text-sm text-gray-400">Out of Stock</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {products.filter(p => p.stock < 10 && p.stock > 0).length}
          </div>
          <div className="text-sm text-gray-400">Low Stock</div>
        </div>
      </div>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchProducts(); // Refresh the products list
          setShowCreateModal(false);
        }}
      />

      {/* Inventory Locations Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Inventory Locations</h2>
              <button 
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {products.reduce((sum, p) => sum + (p.inventoryLocations || []).reduce((locSum, loc) => locSum + loc.quantity, 0), 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Units</div>
                </div>
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">3</div>
                  <div className="text-sm text-gray-400">Warehouses</div>
                </div>
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-400">
                    {products.length}
                  </div>
                  <div className="text-sm text-gray-400">Products</div>
                </div>
              </div>

              {/* Location Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Warehouse Distribution</h3>
                
                {Array.from(new Set(
                  products.flatMap(p => (p.inventoryLocations || []).map(loc => loc.warehouse))
                )).map((warehouse) => {
                  const warehouseProducts = products.filter(p => 
                    (p.inventoryLocations || []).some(loc => loc.warehouse === warehouse)
                  );
                  const totalUnits = warehouseProducts.reduce((sum, p) => 
                    sum + ((p.inventoryLocations || []).find(loc => loc.warehouse === warehouse)?.quantity || 0), 0
                  );

                  return (
                    <div key={warehouse} className="bg-black border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-white">{warehouse}</h4>
                        <span className="text-blue-400 font-bold">{totalUnits} units</span>
                      </div>
                      
                      <div className="space-y-2">
                        {warehouseProducts.map((product) => {
                          const locationData = (product.inventoryLocations || []).find(loc => loc.warehouse === warehouse);
                          return (
                            <div key={product.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-300">{product.name}</span>
                              <span className="text-gray-400">{locationData?.quantity || 0} units</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Products Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Product Locations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-300">Product</th>
                        <th className="text-left py-2 text-gray-300">Total Stock</th>
                        {Array.from(new Set(
                          products.flatMap(p => (p.inventoryLocations || []).map(loc => loc.warehouse))
                        )).map(warehouse => (
                          <th key={warehouse} className="text-left py-2 text-gray-300">{warehouse}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => {
                        return (
                          <tr key={product.id} className="border-b border-gray-800">
                            <td className="py-2 text-white">{product.name}</td>
                            <td className="py-2 text-gray-300">{product.stock}</td>
                            {Array.from(new Set(
                              products.flatMap(p => (p.inventoryLocations || []).map(loc => loc.warehouse))
                            )).map(warehouse => {
                              const qty = (product.inventoryLocations || []).find(loc => loc.warehouse === warehouse)?.quantity || 0;
                              return (
                                <td key={warehouse} className="py-2 text-gray-300">{qty}</td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowLocationModal(false)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">{productToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProductToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadProductsModal
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            fetchProducts();
            setShowBulkUploadModal(false);
          }}
        />
      )}
    </div>
  );
}