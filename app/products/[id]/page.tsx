"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface ProductDetail {
    id: string;
    name: string;
    description: string | null;
    sku: string;
    sellingPrice: number;
    status: string;
    images?: string[];
    merchantId: string;
    categoryId: string;
    createdAt: string;
    updatedAt: string;
    category?: {
        id: string;
        name: string;
    };
    merchant?: {
        id: string;
        businessName: string;
    };
    inventory?: Array<{
        id: string;
        warehouseId: string;
        quantityAvailable: number;
        quantityReserved: number;
        reorderLevel: number;
        maxStockLevel: number;
        warehouse: {
            id: string;
            name: string;
            code: string;
        };
    }>;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productId, setProductId] = useState<string | null>(null);

    useEffect(() => {
        params.then((resolvedParams) => {
            setProductId(resolvedParams.id);
        });
    }, [params]);

    useEffect(() => {
        if (!productId) return;

        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await api.get<{ product: ProductDetail }>(`/api/products/${productId}`);

                // API returns { product } wrapper in data
                if (response.data) {
                    setProduct(response.data.product || response.data as any);
                }
            } catch (error: any) {
                console.error("Error fetching product:", error);
                setError(error.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    const getStockColor = (quantity: number) => {
        if (quantity === 0) return "text-red-400";
        if (quantity < 10) return "text-yellow-400";
        return "text-green-400";
    };

    const getTotalStock = () => {
        if (!product?.inventory) return 0;
        return product.inventory.reduce((sum, inv) => sum + (inv.quantityAvailable - inv.quantityReserved), 0);
    };

    console.log("Product data:", product);

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

    if (error || !product) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
                    <p className="text-gray-400 mb-4">{error || "Product not found"}</p>
                    <button
                        onClick={() => router.push("/products")}
                        className="bg-[#f08c17] text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        Back to Products
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push("/products")}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${product.status === "ACTIVE" ? "bg-green-900 text-green-200" :
                            product.status === "INACTIVE" ? "bg-gray-700 text-gray-300" :
                                "bg-yellow-900 text-yellow-200"
                        }`}>
                        {product.status}
                    </span>
                </div>
                <button
                    onClick={() => router.push(`/products/${product.id}/edit`)}
                    className="bg-[#f08c17] text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                    Edit Product
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Images */}
                    {product.images && product.images.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4">Product Images</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {product.images.map((image, index) => (
                                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                                        <img
                                            src={image}
                                            alt={`${product.name} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Product Details */}
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Product Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Description</label>
                                <p className="text-white mt-1">{product.description || "No description provided"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">SKU</label>
                                    <p className="text-white mt-1 font-mono">{product.sku}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Price</label>
                                    <p className="text-white mt-1 text-xl font-bold">${(product.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Category</label>
                                    <p className="text-white mt-1">{product.category?.name || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Merchant</label>
                                    <p className="text-white mt-1">{product.merchant?.businessName || "N/A"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">Created</label>
                                    <p className="text-white mt-1">{new Date(product.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Last Updated</label>
                                    <p className="text-white mt-1">{new Date(product.updatedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Details */}
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Inventory by Warehouse</h2>
                        {product.inventory && product.inventory.length > 0 ? (
                            <div className="space-y-4">
                                {product.inventory.map((inv) => {
                                    const available = inv.quantityAvailable - inv.quantityReserved;
                                    return (
                                        <div key={inv.id} className="bg-gray-800 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="text-white font-semibold">{inv.warehouse.name}</h3>
                                                    <p className="text-sm text-gray-400">Code: {inv.warehouse.code}</p>
                                                </div>
                                                <div className={`text-2xl font-bold ${getStockColor(available)}`}>
                                                    {available}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Available:</span>
                                                    <span className="text-white ml-2">{inv.quantityAvailable}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Reserved:</span>
                                                    <span className="text-white ml-2">{inv.quantityReserved}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Reorder Level:</span>
                                                    <span className="text-white ml-2">{inv.reorderLevel}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Max Stock:</span>
                                                    <span className="text-white ml-2">{inv.maxStockLevel}</span>
                                                </div>
                                            </div>
                                            {available <= inv.reorderLevel && (
                                                <div className="mt-3 bg-yellow-900 border border-yellow-700 rounded px-3 py-2 text-sm text-yellow-200">
                                                    ⚠️ Stock level is at or below reorder point
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400">No inventory records found</p>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Total Stock</div>
                                <div className={`text-3xl font-bold ${getStockColor(getTotalStock())}`}>
                                    {getTotalStock()}
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Warehouses</div>
                                <div className="text-3xl font-bold text-blue-400">
                                    {product.inventory?.length || 0}
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Price</div>
                                <div className="text-3xl font-bold text-[#f08c17]">
                                    ${product.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Total Reserved</div>
                                <div className="text-3xl font-bold text-orange-400">
                                    {product.inventory?.reduce((sum, inv) => sum + inv.quantityReserved, 0) || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Alert */}
                    {getTotalStock() < 10 && getTotalStock() > 0 && (
                        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="text-yellow-400 text-2xl">⚠️</div>
                                <div>
                                    <h3 className="text-yellow-200 font-semibold mb-1">Low Stock Warning</h3>
                                    <p className="text-yellow-300 text-sm">
                                        This product is running low on stock. Consider reordering soon.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Out of Stock Alert */}
                    {getTotalStock() === 0 && (
                        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="text-red-400 text-2xl">🚫</div>
                                <div>
                                    <h3 className="text-red-200 font-semibold mb-1">Out of Stock</h3>
                                    <p className="text-red-300 text-sm">
                                        This product is currently out of stock in all warehouses.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
