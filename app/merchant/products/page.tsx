"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Grid3x3,
  List,
  Package,
  Warehouse,
  Calendar,
  Eye,
} from "lucide-react";
import { get } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  sku: string;
  weightKg: number;
  dimensions: any;
  imageUrl?: string | null;
  createdAt: string;
  totalStock?: number;
  availableStock?: number;
  orderCount?: number;
  StockAllocation?: Array<{
    id: string;
    allocatedQuantity: number;
    safetyStock: number;
    Warehouse: {
      id: string;
      name: string;
      region: string;
    };
  }>;
  ProductImage?: Array<{
    id: string;
    imageUrl: string;
    isPrimary: boolean;
    altText?: string;
  }>;
}

interface ProductStats {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  orderCount: number;
}

export default function MerchantProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      const res = (await get(`/api/merchant/products?${params}`)) as {
        products: Product[];
        pagination?: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
      setProducts(res.products || []);
      if (res.pagination) {
        setPage(res.pagination.page);
        setLimit(res.pagination.limit);
        setTotalPages(res.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = (await get("/api/merchant/products/stats")) as any;
      setStats({
        totalProducts: res?.totalProducts || 0,
        totalStock: res?.totalStock || 0,
        lowStockItems: res?.lowStockItems || 0,
        orderCount: res?.orderCount || 0,
      });
    } catch (error) {
      setStats({
        totalProducts: 0,
        totalStock: 0,
        lowStockItems: 0,
        orderCount: 0,
      });
    }
  };

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Products</h1>
          <p className="text-gray-400 mt-1">
            View and manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`rounded-none ${
                viewMode === "grid"
                  ? "bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`rounded-none ${
                viewMode === "list"
                  ? "bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-gray-300">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017]"
          >
            Next
          </Button>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setSelectedProduct(null)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-brand-gold mb-4">
              {selectedProduct.name}
            </h2>
            <div className="space-y-2 text-white">
              <div>
                <span className="font-semibold">SKU:</span>{" "}
                {selectedProduct.sku}
              </div>
              <div>
                <span className="font-semibold">Weight (kg):</span>{" "}
                {selectedProduct.weightKg}
              </div>
              <div>
                <span className="font-semibold">Dimensions:</span>{" "}
                {selectedProduct.dimensions &&
                  `${selectedProduct.dimensions.length} x ${selectedProduct.dimensions.width} x ${selectedProduct.dimensions.height}`}
              </div>
              {selectedProduct.imageUrl && (
                <div>
                  <span className="font-semibold">Image:</span>{" "}
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="h-24 inline-block ml-2"
                  />
                </div>
              )}
              <div>
                <span className="font-semibold">Total Stock:</span>{" "}
                {selectedProduct.totalStock ?? "-"}
              </div>
              <div>
                <span className="font-semibold">Available Stock:</span>{" "}
                {selectedProduct.availableStock ?? "-"}
              </div>
              <div>
                <span className="font-semibold">Order Count:</span>{" "}
                {selectedProduct.orderCount ?? 0}
              </div>
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {new Date(selectedProduct.createdAt).toLocaleString()}
              </div>
              {/* Warehouses */}
              {selectedProduct.StockAllocation &&
                selectedProduct.StockAllocation.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-brand-gold">
                      Warehouses:
                    </span>
                    <ul className="mt-2 space-y-1">
                      {selectedProduct.StockAllocation.map((alloc) => (
                        <li
                          key={alloc.id}
                          className="border border-gray-700 rounded p-2"
                        >
                          <div>
                            <span className="font-semibold">Warehouse:</span>{" "}
                            {alloc.Warehouse.name} ({alloc.Warehouse.region})
                          </div>
                          <div>
                            <span className="font-semibold">
                              Allocated Quantity:
                            </span>{" "}
                            {alloc.allocatedQuantity}
                          </div>
                          <div>
                            <span className="font-semibold">Safety Stock:</span>{" "}
                            {alloc.safetyStock}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {/* Images */}
              {selectedProduct.ProductImage &&
                selectedProduct.ProductImage.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-brand-gold">
                      Images:
                    </span>
                    <div className="flex gap-2 mt-2">
                      {selectedProduct.ProductImage.map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt={img.altText || selectedProduct.name}
                          className="h-16 rounded border border-gray-700"
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-80">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                />
                {searchInput !== searchTerm && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-[#f8c017] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {loading && !products.length ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="bg-[#1a1a1a] border border-[#f8c017]/20 hover:shadow-lg hover:shadow-[#f8c017]/10 transition-all group"
            >
              <CardContent className="p-6 space-y-4">
                {/* Product Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-[#f8c017] transition-colors">
                      {product.name}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-[#f8c017] border-[#f8c017]/20 bg-[#f8c017]/5">
                      Weight: {product.weightKg}kg
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-gray-400 border-gray-600 text-xs"
                    >
                      SKU: {product.sku}
                    </Badge>
                  </div>
                </div>
                {/* Product Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Warehouse className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      Warehouses:{" "}
                      {product.StockAllocation
                        ? product.StockAllocation.length
                        : 0}
                    </span>
                    {product.StockAllocation &&
                      product.StockAllocation.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          (
                          {product.StockAllocation.map(
                            (a) => a.Warehouse.name
                          ).join(", ")}
                        </span>
                      )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      Total: {product.totalStock ?? "-"}
                    </span>
                  </div>
                  {/* <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">Created: {new Date(product.createdAt).toLocaleDateString()}</span>
                  </div> */}
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                    SKU: {product.sku}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:border-[#f8c017] hover:text-[#f8c017] h-8 px-3"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Table List View
        <div className="w-full mt-8">
          <table className="w-full text-sm text-left border border-[#f8c017] rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-[#222] text-[#f8c017]">
                <th className="p-2 whitespace-nowrap">Product Name</th>
                <th className="p-2 whitespace-nowrap">SKU</th>
                <th className="p-2 whitespace-nowrap">Weight (kg)</th>
                <th className="p-2 whitespace-nowrap">Dimensions</th>
                <th className="p-2 whitespace-nowrap">Total Stock</th>
                <th className="p-2 whitespace-nowrap">Warehouses</th>
                {/* <th className="p-2 whitespace-nowrap">Created</th> */}
                <th className="p-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#f8c017]/10 hover:bg-[#222] transition"
                >
                  <td className="p-2 text-white max-w-[200px] truncate align-middle font-semibold">
                    {product.name}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {product.sku}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {product.weightKg}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {product.dimensions?.length || 0} ×{" "}
                    {product.dimensions?.width || 0} ×{" "}
                    {product.dimensions?.height || 0}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {product.totalStock ?? "-"}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {product.StockAllocation
                      ? product.StockAllocation.length
                      : 0}
                    {product.StockAllocation &&
                      product.StockAllocation.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          (
                          {product.StockAllocation.map(
                            (a) => a.Warehouse.name
                          ).join(", ")}
                          )
                        </span>
                      )}
                  </td>
                  {/* <td className="p-2 text-white whitespace-nowrap">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td> */}
                  <td className="p-2 flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-600"
                      onClick={() => setSelectedProduct(product)}
                      title="View"
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-2">No products found</p>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              onClick={() => setSelectedProduct(null)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-brand-gold mb-4">
              {selectedProduct.name}
            </h2>
            <div className="space-y-2 text-white">
              <div>
                <span className="font-semibold">SKU:</span>{" "}
                {selectedProduct.sku}
              </div>
              <div>
                <span className="font-semibold">Weight (kg):</span>{" "}
                {selectedProduct.weightKg}
              </div>
              <div>
                <span className="font-semibold">Dimensions:</span>{" "}
                {selectedProduct.dimensions &&
                  `${selectedProduct.dimensions.length} x ${selectedProduct.dimensions.width} x ${selectedProduct.dimensions.height}`}
              </div>
              {selectedProduct.imageUrl && (
                <div>
                  <span className="font-semibold">Image:</span>{" "}
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="h-24 inline-block ml-2"
                  />
                </div>
              )}
              <div>
                <span className="font-semibold">Total Stock:</span>{" "}
                {selectedProduct.totalStock ?? "-"}
              </div>
              <div>
                <span className="font-semibold">Available Stock:</span>{" "}
                {selectedProduct.availableStock ?? "-"}
              </div>
              <div>
                <span className="font-semibold">Order Count:</span>{" "}
                {selectedProduct.orderCount ?? 0}
              </div>
              {/* <div>
                <span className="font-semibold">Created:</span>{" "}
                {new Date(selectedProduct.createdAt).toLocaleString()}
              </div> */}
              {/* Warehouses */}
              {selectedProduct.StockAllocation &&
                selectedProduct.StockAllocation.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-brand-gold">
                      Warehouses:
                    </span>
                    <ul className="mt-2 space-y-1">
                      {selectedProduct.StockAllocation.map((alloc) => (
                        <li
                          key={alloc.id}
                          className="border border-gray-700 rounded p-2"
                        >
                          <div>
                            <span className="font-semibold">Warehouse:</span>{" "}
                            {alloc.Warehouse.name} ({alloc.Warehouse.region})
                          </div>
                          <div>
                            <span className="font-semibold">
                              Allocated Quantity:
                            </span>{" "}
                            {alloc.allocatedQuantity}
                          </div>
                          <div>
                            <span className="font-semibold">Safety Stock:</span>{" "}
                            {alloc.safetyStock}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {/* Images */}
              {selectedProduct.ProductImage &&
                selectedProduct.ProductImage.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-brand-gold">
                      Images:
                    </span>
                    <div className="flex gap-2 mt-2">
                      {selectedProduct.ProductImage.map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt={img.altText || selectedProduct.name}
                          className="h-16 rounded border border-gray-700"
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
