"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Upload,
  Search,
  Package,
  Building2,
  AlertCircle,
  CheckCircle2,
  Grid3x3,
  List,
  Download,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { get, post } from "@/lib/api";
import { toast } from "react-toastify";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

interface Business {
  id: string;
  name: string;
  baseCurrency: string | any;
  city?: string;
  state?: string;
  isActive: boolean;
  productCount: number;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  region: string;
  status: string;
}

interface StockAllocation {
  warehouseId: string;
  allocatedQuantity: number;
  safetyStock: number;
}

export default function AddProductModal({
  isOpen,
  onClose,
  onProductAdded,
}: AddProductModalProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [merchantViewMode, setMerchantViewMode] = useState<"grid" | "list">(
    "grid"
  );
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single product form
  const [singleProduct, setSingleProduct] = useState({
    name: "",
    sku: "",
    initialQuantity: "",
    weightKg: "",
    price: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
  });

  // Stock allocation form
  const [stockAllocations, setStockAllocations] = useState<StockAllocation[]>(
    []
  );
  const [showStockForm, setShowStockForm] = useState(false);
  const [quickQuantity, setQuickQuantity] = useState("");
  const [selectedWarehouseForQuick, setSelectedWarehouseForQuick] =
    useState("");

  // Bulk upload
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [selectedBulkWarehouse, setSelectedBulkWarehouse] =
    useState<string>("");
  const [creatingDefaultWarehouse, setCreatingDefaultWarehouse] =
    useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBusinesses();
      fetchWarehouses();
    }
  }, [isOpen]);

  const fetchBusinesses = async () => {
    try {
      setIsLoadingBusinesses(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("limit", "20");

      const data = (await get(`/api/admin/businesses?${params}`)) as any;
      setBusinesses(data?.businesses || []);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      setBusinesses([]);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      setIsLoadingWarehouses(true);
      const data = (await get("/api/admin/warehouses")) as any;
      let whs = data?.warehouses || [];
      // If no warehouses, create Default
      if (selectedBusiness && whs.length === 0 && !creatingDefaultWarehouse) {
        setCreatingDefaultWarehouse(true);
        try {
          const res = await post("/api/admin/warehouses", {
            name: "Default",
            region: "Default",
            status: "ACTIVE",
            businessId: selectedBusiness.id,
          });
          whs = [...whs, res];
          setSelectedBulkWarehouse((res as Warehouse).id);
        } catch (err) {
          toast.error("Failed to create Default warehouse");
        } finally {
          setCreatingDefaultWarehouse(false);
        }
      }
      setWarehouses(whs);
      if (whs.length > 0 && !selectedBulkWarehouse) {
        setSelectedBulkWarehouse(whs[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
      setWarehouses([]);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBusinesses();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBusinessSelect = (business: Business) => {
    if (!business.isActive) return;
    setSelectedBusiness(business);
  };

  const addStockAllocation = () => {
    setStockAllocations([
      ...stockAllocations,
      {
        warehouseId: "",
        allocatedQuantity: 0,
        safetyStock: 0,
      },
    ]);
  };

  // Remove a warehouse allocation
  const removeStockAllocation = (index: number) => {
    setStockAllocations(stockAllocations.filter((_, i) => i !== index));
  };

  // Transfer stock between warehouses
  const transferStockAllocation = (
    fromIndex: number,
    toWarehouseId: string,
    transferQuantity: number
  ) => {
    const updated = [...stockAllocations];
    // Remove quantity from source
    if (updated[fromIndex].allocatedQuantity < transferQuantity) {
      toast.error(
        "Transfer quantity exceeds available stock in source warehouse"
      );
      return;
    }
    updated[fromIndex].allocatedQuantity -= transferQuantity;
    // Add quantity to destination
    const toIndex = updated.findIndex((sa) => sa.warehouseId === toWarehouseId);
    if (toIndex !== -1) {
      updated[toIndex].allocatedQuantity += transferQuantity;
    } else {
      updated.push({
        warehouseId: toWarehouseId,
        allocatedQuantity: transferQuantity,
        safetyStock: 0,
      });
    }
    setStockAllocations(updated.filter((sa) => sa.allocatedQuantity > 0));
  };

  // Update allocation field
  const updateStockAllocation = (
    index: number,
    field: keyof StockAllocation,
    value: string | number
  ) => {
    const updated = [...stockAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setStockAllocations(updated);
  };

  // Validate total allocated quantity
  const getTotalAllocatedQuantity = () => {
    return stockAllocations.reduce(
      (sum, sa) => sum + Number(sa.allocatedQuantity),
      0
    );
  };

  const handleSingleProductSubmit = async () => {
    if (!selectedBusiness) {
      toast.error("Please select a merchant first");
      return;
    }

    if (!singleProduct.name || !singleProduct.weightKg) {
      toast.error(
        "Please fill in all required fields (Product Name and Weight)"
      );
      return;
    }

    // Validate at least one valid warehouse allocation or assign to default
    let validStockAllocations = stockAllocations.filter(
      (sa) => sa.warehouseId && sa.allocatedQuantity > 0
    );

    // If no valid allocations, assign to default warehouse
    if (validStockAllocations.length === 0) {
      const defaultWarehouse = warehouses.find(
        (w) => w.name.toLowerCase() === "default" && w.status === "ACTIVE"
      );
      if (defaultWarehouse) {
        validStockAllocations = [
          {
            warehouseId: defaultWarehouse.id,
            allocatedQuantity: 1,
            safetyStock: 0,
          },
        ];
        toast.info(
          "No valid warehouse allocation found. Assigned to Default warehouse."
        );
      } else {
        toast.error(
          "No valid warehouse allocation and no Default warehouse found. Please allocate stock."
        );
        return;
      }
    }

    // Check for duplicate warehouse allocations
    const warehouseIds = validStockAllocations.map((sa) => sa.warehouseId);
    if (new Set(warehouseIds).size !== warehouseIds.length) {
      toast.error("Cannot have multiple allocations for the same warehouse");
      return;
    }

    // Validate total allocated quantity does not exceed product quantity
    const totalAllocated = validStockAllocations.reduce(
      (sum, sa) => sum + Number(sa.allocatedQuantity),
      0
    );
    const initialQuantity = Number(singleProduct.initialQuantity);
    if (totalAllocated > initialQuantity) {
      toast.error("Total allocated quantity exceeds product initial quantity");
      return;
    }

    try {
      setIsCreatingProduct(true);

      // Validate weight is a valid number
      const weight = parseFloat(singleProduct.weightKg);
      if (isNaN(weight) || weight <= 0) {
        toast.error("Please enter a valid weight (must be greater than 0)");
        return;
      }

      // Build dimensions object only if values are provided
      const dimensions: any = {};
      if (
        singleProduct.dimensions.length &&
        !isNaN(parseFloat(singleProduct.dimensions.length))
      ) {
        dimensions.length = parseFloat(singleProduct.dimensions.length);
      }
      if (
        singleProduct.dimensions.width &&
        !isNaN(parseFloat(singleProduct.dimensions.width))
      ) {
        dimensions.width = parseFloat(singleProduct.dimensions.width);
      }
      if (
        singleProduct.dimensions.height &&
        !isNaN(parseFloat(singleProduct.dimensions.height))
      ) {
        dimensions.height = parseFloat(singleProduct.dimensions.height);
      }

      const productData = {
        name: singleProduct.name.trim(),
        businessId: selectedBusiness.id,
        initialQuantity: Number(singleProduct.initialQuantity),
        weightKg: weight,
        ...(singleProduct.sku.trim() ? { sku: singleProduct.sku.trim() } : {}),
        ...(Object.keys(dimensions).length > 0 ? { dimensions } : {}),
        stockAllocations: validStockAllocations,
      };

      console.log("📦 Sending product data:", productData);

      const result = (await post("/api/admin/products", productData)) as any;

      if (result.success) {
        toast.success(
          "Product created and assigned to warehouse successfully!"
        );
        onProductAdded();

        // Reset form
        setSingleProduct({
          name: "",
          sku: "",
          initialQuantity: "",
          weightKg: "",
          price: "",
          dimensions: {
            length: "",
            width: "",
            height: "",
          },
        });
        setStockAllocations([]);
        setShowStockForm(false);
        setSelectedBusiness(null);
        onClose();
      } else {
        const errorMessage =
          result.message || result.error || "Failed to create product";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("🔥 Failed to create product:", error);
      const errorMessage =
        error.message || "Failed to create product. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedBusiness || !bulkFile || !selectedBulkWarehouse) {
      toast.error(
        "Please select a merchant, upload a file, and select a warehouse"
      );
      return;
    }

    try {
      setIsCreatingProduct(true);
      const text = await bulkFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        toast.error(
          "CSV file must have a header row and at least one data row"
        );
        return;
      }
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const products = [];
      const errors = [];
      // Track used SKUs for uniqueness
      const usedSkus = new Set();
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        const product: any = {};
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            product[header] = values[index];
          }
        });
        // Validate required fields and values
        if (!product.name || product.name.length > 255) {
          errors.push(`Row ${i + 1}: Missing or too long product name.`);
          continue;
        }
        // Validate businessId and warehouseId
        if (!selectedBusiness?.id) {
          errors.push(`Row ${i + 1}: Invalid businessId.`);
          continue;
        }
        if (!selectedBulkWarehouse) {
          errors.push(`Row ${i + 1}: Invalid warehouseId.`);
          continue;
        }
        // Validate numbers
        const weightKg = parseFloat(product.weightKg);
        if (!product.weightKg || isNaN(weightKg) || weightKg <= 0) {
          errors.push(`Row ${i + 1}: Invalid or missing weightKg.`);
          continue;
        }
        const initialQuantity = parseInt(product.quantity);
        const allocatedQuantity = parseInt(product.quantity);
        if (
          !product.quantity ||
          isNaN(initialQuantity) ||
          initialQuantity < 0
        ) {
          errors.push(`Row ${i + 1}: Invalid or missing quantity.`);
          continue;
        }
        if (allocatedQuantity > initialQuantity) {
          errors.push(
            `Row ${i + 1}: Allocated quantity exceeds initial quantity.`
          );
          continue;
        }
        // Validate dimensions
        const length = product.length ? parseFloat(product.length) : undefined;
        const width = product.width ? parseFloat(product.width) : undefined;
        const height = product.height ? parseFloat(product.height) : undefined;
        if (
          (length !== undefined && (isNaN(length) || length <= 0)) ||
          (width !== undefined && (isNaN(width) || width <= 0)) ||
          (height !== undefined && (isNaN(height) || height <= 0))
        ) {
          errors.push(
            `Row ${i + 1}: Invalid dimensions (must be positive numbers).`
          );
          continue;
        }
        // Validate stock allocation
        if (allocatedQuantity < 0) {
          errors.push(`Row ${i + 1}: Allocated quantity must be non-negative.`);
          continue;
        }
        const safetyStock = Math.floor(allocatedQuantity * 0.1);
        if (safetyStock < 0) {
          errors.push(`Row ${i + 1}: Safety stock must be non-negative.`);
          continue;
        }
        // Generate unique SKU if missing or not unique
        let skuValue = product.sku;
        if (
          !skuValue ||
          typeof skuValue !== "string" ||
          skuValue.trim() === "" ||
          skuValue.trim().toLowerCase() === "auto" ||
          usedSkus.has(skuValue.trim())
        ) {
          skuValue = `SKU-${product.name
            .replace(/\s+/g, "-")
            .substring(0, 20)}-${Math.random().toString(36).substring(2, 8)}`;
        }
        skuValue = skuValue.trim();
        usedSkus.add(skuValue);
        // Ensure all required fields are present
        const productPayload = {
          name: product.name,
          sku: skuValue,
          weightKg,
          businessId: selectedBusiness.id,
          initialQuantity,
          price:
            product.price && !isNaN(parseFloat(product.price))
              ? parseFloat(product.price)
              : undefined,
          dimensions: {
            ...(length !== undefined ? { length } : {}),
            ...(width !== undefined ? { width } : {}),
            ...(height !== undefined ? { height } : {}),
          },
          stockAllocations: [
            {
              warehouseId: selectedBulkWarehouse,
              allocatedQuantity,
              safetyStock,
            },
          ],
          description: product.description || "",
        };
        // Debug log for payload
        console.log(`Bulk Upload Row ${i + 1} Payload:`, productPayload);
        products.push(productPayload);
      }
      if (products.length === 0) {
        toast.error(`No valid products found.\n${errors.join("\n")}`);
        setBulkFile(null);
        setBulkPreview([]);
        setIsCreatingProduct(false);
        return;
      }
      // Make API call to create products
      const result: any = await post("/api/admin/products", products);
      // Show both success and error feedback for each product
      let backendErrors = [];
      let backendSuccesses = [];
      if (result.results && Array.isArray(result.results)) {
        backendErrors = result.results
          .map((r: any, idx: number) =>
            r.success
              ? null
              : `Row ${idx + 2}: ${
                  r.error || result.error || result.message || "Unknown error"
                }`
          )
          .filter(Boolean);
        backendSuccesses = result.results
          .map((r: any, idx: number) => (r.success ? `Row ${idx + 2}` : null))
          .filter(Boolean);
      } else if (result.error || result.message) {
        backendErrors = [result.error || result.message];
      }
      if (backendErrors.length > 0) {
        toast.error(
          `Some products failed to upload:\n${backendErrors.join("\n")}`
        );
      }
      if (backendSuccesses.length > 0) {
        toast.success(
          `${
            backendSuccesses.length
          } products uploaded successfully! (${backendSuccesses.join(", ")})`
        );
      }
      if (backendSuccesses.length > 0) {
        // Fetch latest products after successful upload
        if (
          typeof window !== "undefined" &&
          typeof onProductAdded === "function"
        ) {
          await onProductAdded();
        }
        setBulkFile(null);
        setBulkPreview([]);
        setSelectedBusiness(null);
        onClose();
      }
      if (
        backendErrors.length === 0 &&
        backendSuccesses.length === 0 &&
        !result.success
      ) {
        const errorMessage =
          result.message || result.error || "Failed to upload products";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast.error("Failed to process bulk upload. Please try again.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBulkFile(file);

      // Parse CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error(
            "CSV file must have a header row and at least one data row"
          );
          setBulkFile(null);
          setBulkPreview([]);
          return;
        }

        // Parse header
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));
        const requiredHeaders = ["name", "weightKg"]; // Remove SKU from required headers
        const optionalHeaders = [
          "sku",
          "length",
          "width",
          "height",
          "quantity",
          "warehouseCode",
        ];
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h)
        );

        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
          setBulkFile(null);
          setBulkPreview([]);
          return;
        }

        // Parse data rows
        const products = [];
        for (let i = 1; i < Math.min(lines.length, 11); i++) {
          const values = lines[i]
            .split(",")
            .map((v) => v.trim().replace(/"/g, ""));
          const product: any = {};
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              product[header] = values[index];
            }
          });

          // Validate required fields
          if (product.name && product.weightKg) {
            // Remove SKU requirement
            products.push({
              name: product.name,
              sku: product.sku || "", // SKU is optional
              weight: product.weightKg,
              length: product.length || "",
              width: product.width || "",
              height: product.height || "",
              quantity: product.quantity || "",
              warehouseCode: product.warehouseCode || "",
              description: product.description || "",
            });
          }
        }

        setBulkPreview(products);

        if (products.length === 0) {
          toast.error("No valid products found in the CSV file");
          setBulkFile(null);
        } else {
          toast.success(`Found ${products.length} valid products in preview`);
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-[#f8c017]" />
            Add Products
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add products individually or upload in bulk. First select a merchant
            to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">
              Select Merchant <span className="text-red-400">*</span>
            </Label>
            {/* Search Field */}
            <Input
              type="text"
              placeholder="Search merchants by name, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3 bg-[#2a2a2a] border-gray-600 text-white"
            />
            <div className="max-h-60 overflow-auto border border-gray-600 rounded-lg">
              {isLoadingBusinesses ? (
                <div className="p-4 text-center text-gray-400">
                  Loading merchants...
                </div>
              ) : searchQuery.trim() === "" ? (
                <div className="p-4 text-center text-gray-400">
                  Searched result would be displayed here
                </div>
              ) : filteredBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                  {filteredBusinesses.map((business) => (
                    <div
                      key={business.id}
                      onClick={() => handleBusinessSelect(business)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        business.isActive
                          ? "hover:bg-gray-700 border-transparent hover:border-[#f8c017]/30 hover:shadow-sm"
                          : "opacity-50 cursor-not-allowed border-gray-700"
                      }${
                        selectedBusiness?.id === business.id
                          ? " border-[#f8c017] bg-[#23220f] ring-2 ring-[#f8c017]"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div className="font-medium text-white text-sm truncate">
                            {business.name}
                          </div>
                        </div>
                        {business.isActive ? (
                          <Badge className="bg-green-500/10 text-green-400 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {business.city}, {business.state} •{" "}
                        {business.productCount} products
                      </div>
                      <div className="text-xs text-gray-400">
                        Base Currency . {business.baseCurrency}
                      </div>
                      {business.isActive && (
                        <div className="flex justify-end">
                          <CheckCircle2 className="h-4 w-4 text-[#f8c017]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  No merchants found. Try adjusting your search.
                </div>
              )}
            </div>
            {!selectedBusiness && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                You must select a merchant before adding products
              </div>
            )}
          </div>

          <div className="pt-4">
            {selectedBusiness && (
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="bg-[#2a2a2a] border w-full my-3 border-gray-600">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="manual">
                  {selectedBusiness && (
                    <div className="space-y-4 mt-6">
                      {/* Product form fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Product Name *
                          </Label>
                          <Input
                            placeholder="Enter product name"
                            value={singleProduct.name}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            SKU (Optional)
                          </Label>
                          <Input
                            placeholder="Leave empty for auto-generation (e.g., SKU-NE_01)"
                            value={singleProduct.sku}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                sku: e.target.value,
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                          <p className="text-xs text-gray-400">
                            If left empty, SKU will be auto-generated as: SKU-
                            {singleProduct.name.length > 0
                              ? `${singleProduct.name
                                  .charAt(0)
                                  .toUpperCase()}${singleProduct.name
                                  .charAt(singleProduct.name.length - 1)
                                  .toUpperCase()}_01`
                              : "XX_01"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Initial Quantity *
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Enter initial stock quantity"
                            value={singleProduct.initialQuantity}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                initialQuantity: e.target.value,
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Price input removed as per new requirements */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Weight (kg) *
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={singleProduct.weightKg}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                weightKg: e.target.value,
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Length (cm)
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={singleProduct.dimensions.length}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                dimensions: {
                                  ...prev.dimensions,
                                  length: e.target.value,
                                },
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Width (cm)
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={singleProduct.dimensions.width}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                dimensions: {
                                  ...prev.dimensions,
                                  width: e.target.value,
                                },
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-300">
                            Height (cm)
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={singleProduct.dimensions.height}
                            onChange={(e) =>
                              setSingleProduct((prev) => ({
                                ...prev,
                                dimensions: {
                                  ...prev.dimensions,
                                  height: e.target.value,
                                },
                              }))
                            }
                            className="bg-[#2a2a2a] border-gray-600 text-white"
                          />
                        </div>
                      </div>

                      {/* Advanced Allocation UI */}
                      <div className="space-y-4 border-t border-gray-600 pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-gray-300">
                              Initial Inventory
                            </Label>
                            <p className="text-xs text-gray-400 mt-1">
                              Set initial stock quantities for warehouses
                            </p>
                            <p className="text-xs text-amber-400 mt-1">
                              💡 Products without warehouse assignment will use
                              Default warehouse if quantity is specified
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowStockForm(!showStockForm)}
                              className="text-xs border-[#f8c017] bg-[#f8c017] text-[#f08c17] hover:bg-[#e6ad15]"
                            >
                              Advanced Setup
                            </Button>
                          </div>
                        </div>

                        {showStockForm && (
                          <Card className="bg-[#2a2a2a] border-gray-600">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-white">
                                  Warehouse Allocations
                                </h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addStockAllocation}
                                  className="bg-[#f8c017] text-[#f08c17] hover:text-gray-200 transition-all duration-300 hover:bg-[#e6ad15] text-sm px-3 py-1"
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Allocate Warehouse
                                </Button>
                              </div>

                              {isLoadingWarehouses && (
                                <div className="text-center py-4 text-gray-400">
                                  Loading warehouses...
                                </div>
                              )}

                              {!isLoadingWarehouses &&
                                warehouses.length === 0 && (
                                  <div className="text-center py-4 text-gray-400">
                                    No warehouses available
                                  </div>
                                )}

                              {stockAllocations.length === 0 && (
                                <div className="text-center py-8">
                                  <WarehouseIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                                  <p className="text-gray-400">
                                    No warehouse allocations added. Click
                                    "Allocate Warehouse" to assign initial
                                    inventory.
                                  </p>
                                </div>
                              )}

                              {stockAllocations.map((allocation, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                                >
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-400">
                                      Warehouse
                                    </Label>
                                    <select
                                      value={allocation.warehouseId}
                                      onChange={(e) =>
                                        updateStockAllocation(
                                          index,
                                          "warehouseId",
                                          e.target.value
                                        )
                                      }
                                      className="w-full h-9 px-3 text-sm border border-gray-600 rounded-md bg-[#2a2a2a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                                    >
                                      <option value="">Select warehouse</option>
                                      {warehouses
                                        .filter((w) => w.status === "ACTIVE")
                                        .map((warehouse) => (
                                          <option
                                            key={warehouse.id}
                                            value={warehouse.id}
                                          >
                                            {warehouse.name} ({warehouse.region}
                                            )
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-400">
                                      Initial Stock
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={allocation.allocatedQuantity}
                                      onChange={(e) =>
                                        updateStockAllocation(
                                          index,
                                          "allocatedQuantity",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 text-sm bg-[#2a2a2a] border-gray-600 text-white"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-400">
                                      Safety Stock
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={allocation.safetyStock}
                                      onChange={(e) =>
                                        updateStockAllocation(
                                          index,
                                          "safetyStock",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 text-sm bg-[#2a2a2a] border-gray-600 text-white"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeStockAllocation(index)
                                      }
                                      className="h-9 w-full text-xs border-red-600 text-red-400 hover:bg-red-600/10"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}

                              {stockAllocations.length > 0 && (
                                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-600">
                                  <div className="text-sm text-gray-300">
                                    <strong>Total Initial Stock:</strong>{" "}
                                    {stockAllocations.reduce(
                                      (sum, sa) => sum + sa.allocatedQuantity,
                                      0
                                    )}{" "}
                                    units
                                  </div>
                                  <div className="text-sm text-gray-300">
                                    <strong>Total Safety Stock:</strong>{" "}
                                    {stockAllocations.reduce(
                                      (sum, sa) => sum + sa.safetyStock,
                                      0
                                    )}{" "}
                                    units
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-gray-600 text-gray-300 hover:border-gray-500"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSingleProductSubmit}
                            disabled={
                              !singleProduct.name ||
                              !singleProduct.weightKg ||
                              isCreatingProduct ||
                              (stockAllocations.length > 0 &&
                                stockAllocations.filter(
                                  (sa) =>
                                    sa.warehouseId && sa.allocatedQuantity > 0
                                ).length === 0)
                            }
                            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90 disabled:opacity-50"
                          >
                            {isCreatingProduct ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border border-black border-t-transparent mr-2"></div>
                                Creating...
                              </>
                            ) : (
                              "Add Product"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="bulk">
                  {selectedBusiness && (
                    <div className="space-y-6 border-t border-gray-600 pt-6">
                      <Card className="bg-[#2a2a2a] border-gray-600">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-white">
                              Bulk Product Upload
                            </h4>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href =
                                  "/templates/product-bulk-upload-template.csv";
                                link.download =
                                  "product-bulk-upload-template.csv";
                                link.click();
                              }}
                              className="border-[#f8c017] text-[#f8c017] hover:bg-[#f8c017]/10"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Template
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      <div className="space-y-4">
                        <Label className="text-sm font-medium text-gray-300">
                          Select Warehouse{" "}
                          <span className="text-red-400">*</span>
                        </Label>
                        <select
                          value={selectedBulkWarehouse}
                          onChange={(e) =>
                            setSelectedBulkWarehouse(e.target.value)
                          }
                          className="w-full h-10 px-3 border border-gray-600 rounded-md bg-[#2a2a2a] text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                          disabled={
                            isLoadingWarehouses || creatingDefaultWarehouse
                          }
                        >
                          <option value="">Select warehouse</option>
                          {warehouses
                            .filter((w) => w.status === "ACTIVE")
                            .map((warehouse) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.region})
                              </option>
                            ))}
                        </select>
                      </div>
                      {/* File Upload Area */}
                      <div className="border border-dashed border-gray-600 rounded-lg p-6 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <div className="space-y-2">
                          <Label
                            htmlFor="bulk-upload"
                            className="text-lg font-medium text-white cursor-pointer"
                          >
                            Upload CSV File
                          </Label>
                          <p className="text-sm text-gray-400">
                            Drag and drop your file here, or click to browse
                          </p>
                          <p className="text-xs text-gray-500">
                            Supported formats: CSV (.csv)
                          </p>
                          <Input
                            id="bulk-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                      {bulkFile && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-[#f8c017]/10 border border-[#f8c017]/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#f8c017]" />
                              <span className="text-white">
                                {bulkFile.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBulkFile(null);
                                setBulkPreview([]);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              Remove
                            </Button>
                          </div>
                          {bulkPreview.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-300">
                                Preview ({bulkPreview.length} products)
                              </Label>
                              <div className="border border-gray-600 rounded-lg overflow-hidden">
                                <table className="min-w-full bg-[#2a2a2a] text-sm">
                                  <thead className="bg-[#23220f] text-gray-300">
                                    <tr>
                                      <th className="px-4 py-2 text-left">
                                        Product Name
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        SKU
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Weight (kg)
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Dimensions
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Quantity
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Warehouse
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Merchant
                                      </th>
                                      <th className="px-4 py-2 text-left">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-white">
                                    {bulkPreview.map((product, index) => (
                                      <tr
                                        key={index}
                                        className="border-b border-gray-700 last:border-b-0"
                                      >
                                        <td className="px-4 py-2 truncate">
                                          {product.name}
                                        </td>
                                        <td className="px-4 py-2 text-xs">
                                          {product.sku || "Auto"}
                                        </td>
                                        <td className="px-4 py-2">
                                          {product.weight}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-400">
                                          {product.length &&
                                          product.width &&
                                          product.height
                                            ? `${product.length}×${product.width}×${product.height}`
                                            : "N/A"}
                                        </td>
                                        <td
                                          className={`px-4 py-2 text-sm ${
                                            product.quantity
                                              ? "text-[#f8c017] font-medium"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {product.quantity || "None"}
                                        </td>
                                        <td
                                          className={`px-4 py-2 text-xs ${
                                            selectedBulkWarehouse
                                              ? "text-[#f8c017]"
                                              : "text-gray-400"
                                          }`}
                                        >
                                          {warehouses.find(
                                            (w) =>
                                              w.id === selectedBulkWarehouse
                                          )?.name || "Default"}
                                        </td>
                                        <td className="px-4 py-2">
                                          {selectedBusiness?.name || "-"}
                                        </td>
                                        <td className="px-4 py-2 flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-400 hover:text-blue-600"
                                            onClick={() => {
                                              toast.info(
                                                `View product: ${product.name}`
                                              );
                                            }}
                                          >
                                            View
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-600"
                                            onClick={() => {
                                              setBulkPreview((prev) =>
                                                prev.filter(
                                                  (_, i) => i !== index
                                                )
                                              );
                                              toast.info(
                                                `Removed product: ${product.name}`
                                              );
                                            }}
                                          >
                                            Delete
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="border-gray-600 text-gray-300 hover:border-gray-500"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleBulkUpload}
                          disabled={
                            !bulkFile ||
                            isCreatingProduct ||
                            !selectedBulkWarehouse
                          }
                          className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90 disabled:opacity-50"
                        >
                          {isCreatingProduct ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border border-black border-t-transparent mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            "Upload Products"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
