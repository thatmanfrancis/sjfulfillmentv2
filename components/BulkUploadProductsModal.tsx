"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface BulkUploadProductsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface PreviewProduct {
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  costPrice?: number;
  sellingPrice?: number;
  weight?: number;
  weightUnit?: string;
  warehouseId?: string;
  quantity?: number;
  status: string;
  errors?: string[];
}

interface UploadResponse {
  success: any;
  failed: any;
  errors: Array<{ row: number; error: string }>;
  products?: any[];
}

export default function BulkUploadProductsModal({ onClose, onSuccess }: BulkUploadProductsModalProps) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewProduct[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await api.get<{ merchants: any[] }>("/api/merchants");
      setMerchants(response.data?.merchants || []);
    } catch (error) {
      console.error("Failed to fetch merchants:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        alert("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      parseCSVPreview(selectedFile);
    }
  };

  const parseCSVPreview = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      alert("CSV file is empty or has no data rows");
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const previewData: PreviewProduct[] = [];

    // Parse first 5 rows for preview
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      previewData.push({
        name: row.name || row.productname || "",
        sku: row.sku || "",
        description: row.description || "",
        categoryId: row.categoryid || row.category_id || "",
        costPrice: parseFloat(row.costprice || row.cost_price || "0") || 0,
        sellingPrice: parseFloat(row.sellingprice || row.selling_price || "0") || 0,
        weight: parseFloat(row.weight || "0") || 0,
        weightUnit: row.weightunit || row.weight_unit || "kg",
        warehouseId: row.warehouseid || row.warehouse_id || "",
        quantity: parseInt(row.quantity || "0") || 0,
        status: row.status || "ACTIVE",
        errors: !row.name ? ["Name is required"] : [],
      });
    }

    setPreview(previewData);
    setShowPreview(true);
  };

  const handleUpload = async () => {
    if (!selectedMerchant) {
      alert("Please select a merchant");
      return;
    }

    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("merchantId", selectedMerchant);

      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        
        if (result.success > 0) {
          setTimeout(() => {
            onSuccess?.();
            if (result.failed === 0) {
              onClose();
            }
          }, 2000);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload products");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "Failed to upload products");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,sku,description,categoryId,costPrice,sellingPrice,weight,weightUnit,warehouseId,quantity,status
Sample Product 1,,High quality product,,,29.99,1.5,kg,,100,ACTIVE
Sample Product 2,SKU-002,Another great product,,,49.99,2.0,kg,,50,ACTIVE
Sample Product 3,SKU-003,Premium product,,,99.99,0.5,kg,,25,ACTIVE`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
          <h2 className="text-2xl font-bold text-white">Bulk Upload Products</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <h3 className="text-blue-200 font-semibold mb-2">📋 Instructions</h3>
            <ul className="text-blue-300 text-sm space-y-1 list-disc list-inside">
              <li>Select a merchant for all products in the CSV</li>
              <li>Download the template or prepare your CSV file</li>
              <li>Required columns: <strong>name</strong></li>
              <li>Optional columns: sku, description, categoryId, costPrice, sellingPrice, weight, weightUnit, warehouseId, quantity, status</li>
              <li>SKU will be auto-generated if not provided</li>
              <li>Images can be added later by editing individual products</li>
            </ul>
          </div>

          {/* Merchant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Merchant <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f08c17]"
              disabled={uploading}
            >
              <option value="">-- Select Merchant --</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.businessName}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                CSV File <span className="text-red-400">*</span>
              </label>
              <button
                onClick={downloadTemplate}
                className="text-[#f08c17] hover:text-orange-500 text-sm font-medium"
              >
                📥 Download Template
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 text-left"
              >
                {file ? file.name : "Choose CSV file..."}
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && preview.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">
                Preview (first {preview.length} rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 text-gray-300">SKU</th>
                      <th className="text-left py-2 px-2 text-gray-300">Price</th>
                      <th className="text-left py-2 px-2 text-gray-300">Qty</th>
                      <th className="text-left py-2 px-2 text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((product, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="py-2 px-2">
                          <div className="text-white">{product.name || "-"}</div>
                          {product.errors && product.errors.length > 0 && (
                            <div className="text-red-400 text-xs">{product.errors.join(", ")}</div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-gray-300">{product.sku || "Auto"}</td>
                        <td className="py-2 px-2 text-gray-300">${product.sellingPrice?.toFixed(2) || "0.00"}</td>
                        <td className="py-2 px-2 text-gray-300">{product.quantity || 0}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-1 rounded text-xs bg-green-900 text-green-200">
                            {product.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`rounded-lg p-4 border ${
              uploadResult.failed === 0 
                ? "bg-green-900 border-green-700" 
                : "bg-yellow-900 border-yellow-700"
            }`}>
              <h3 className={`font-semibold mb-2 ${
                uploadResult.failed === 0 ? "text-green-200" : "text-yellow-200"
              }`}>
                Upload Complete
              </h3>
              <div className={`text-sm ${
                uploadResult.failed === 0 ? "text-green-300" : "text-yellow-300"
              }`}>
                <p>✓ Successfully uploaded: {uploadResult.success} products</p>
                {uploadResult.failed > 0 && (
                  <>
                    <p>✗ Failed: {uploadResult.failed} products</p>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="font-semibold mb-1">Errors:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {uploadResult.errors.map((err, idx) => (
                            <li key={idx}>Row {err.row}: {err.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {uploadResult?.success > 0 && uploadResult?.failed === 0 ? "Close" : "Cancel"}
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedMerchant || !file || uploading}
              className="px-6 py-2 bg-[#f08c17] text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                "Upload Products"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
