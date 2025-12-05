"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, AlertTriangle, TrendingDown } from "lucide-react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  // category: string; // Removed, not present in backend
  currentStock: number;
  minimumStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  lastRestocked: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export default function MerchantInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currency, setCurrency] = useState<string>("");
  const [stats, setStats] = useState<{
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  } | null>(null);
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data: any = await get("/api/merchant/inventory");
        if (data.inventory) {
          // Map backend data to InventoryItem shape
          const mappedInventory: InventoryItem[] = data.inventory.map(
            (item: any) => ({
              id: item.id,
              sku: item.sku,
              name: item.name,
              currentStock: item.initialQuantity ?? 0,
              minimumStock: 10, // TODO: fetch real minStock if available
              maxStock: 100, // TODO: fetch real maxStock if available
              unitPrice: item.price ?? 0,
              totalValue: (item.price ?? 0) * (item.initialQuantity ?? 0),
              lastRestocked: item.createdAt ?? "",
              status:
                (item.initialQuantity ?? 0) === 0
                  ? "out_of_stock"
                  : (item.initialQuantity ?? 0) < 10
                  ? "low_stock"
                  : "in_stock",
            })
          );
          setInventory(mappedInventory);
          setStats(data.stats);
          setCurrency(data.currency || "");
        }
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <Package className="h-4 w-4" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4" />;
      case "out_of_stock":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Use stats from backend for cards
  const totalValue = stats?.totalValue ?? 0;
  const lowStockItems = stats?.lowStockItems ?? 0;
  const outOfStockItems = stats?.outOfStockItems ?? 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-8 bg-background min-h-screen py-8 px-4 md:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage your product inventory levels.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Inventory Value
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currency}{" "}
                {totalValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Low Stock Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems}</div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Out of Stock
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems}</div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.length}</div>
            </CardContent>
          </Card>
        </div>
        {/* Inventory Table */}
        <div className="w-full mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 whitespace-nowrap">Name</th>
                <th className="p-2 whitespace-nowrap">SKU</th>
                <th className="p-2 whitespace-nowrap">Stock</th>
                <th className="p-2 whitespace-nowrap">Min</th>
                <th className="p-2 whitespace-nowrap">Max</th>
                <th className="p-2 whitespace-nowrap">Value</th>
                <th className="p-2 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#f08c17]/10 hover:bg-[#222] transition"
                >
                  <td className="p-2 text-white whitespace-nowrap max-w-[200px] truncate align-middle font-semibold">
                    {item.name}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.sku}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.currentStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.minimumStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.maxStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {currency} {item.totalValue.toFixed(2)}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <Badge className={getStatusColor(item.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        {item.status.replace("_", " ").charAt(0).toUpperCase() +
                          item.status.replace("_", " ").slice(1)}
                      </div>
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <Card className="border border-border bg-card shadow-sm mt-8">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  No inventory items found matching your criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 bg-background min-h-screen py-8 px-4 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Inventory Management
        </h1>
        <p className="text-muted-foreground">
          Track and manage your product inventory levels.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inventory Value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockItems}</div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col md:flex-row gap-4 pt-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <Button variant="outline">Add Product</Button>
      </div>
      <div className="space-y-4 pt-2">
        {/* Inventory Table */}
        <div className="w-full mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 whitespace-nowrap">Name</th>
                <th className="p-2 whitespace-nowrap">SKU</th>
                <th className="p-2 whitespace-nowrap">Stock</th>
                <th className="p-2 whitespace-nowrap">Min</th>
                <th className="p-2 whitespace-nowrap">Max</th>
                <th className="p-2 whitespace-nowrap">Value</th>
                <th className="p-2 whitespace-nowrap">Status</th>
                {/* <th className="p-2 whitespace-nowrap">Last Restocked</th> */}
                {/* <th className="p-2 whitespace-nowrap">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#f08c17]/10 hover:bg-[#222] transition"
                >
                  <td className="p-2 text-white whitespace-nowrap max-w-[200px] truncate align-middle font-semibold">
                    {item.name}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.sku}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.currentStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.minimumStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {item.maxStock}
                  </td>
                  <td className="p-2 text-white whitespace-nowrap">
                    {currency} {item.totalValue.toFixed(2)}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <Badge className={getStatusColor(item.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        {item.status.replace("_", " ").charAt(0).toUpperCase() +
                          item.status.replace("_", " ").slice(1)}
                      </div>
                    </Badge>
                  </td>
                  {/* <td className="p-2 text-white whitespace-nowrap">
                    {new Date(item.lastRestocked).toLocaleDateString()}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Restock
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <Card className="border border-border bg-card shadow-sm mt-8">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  No inventory items found matching your criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
// Main render (not loading)
