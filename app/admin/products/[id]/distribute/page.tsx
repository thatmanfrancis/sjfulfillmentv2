"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminProductDistributePage(props: any) {
  const productId = props?.params?.id;
  const [product, setProduct] = useState<any | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, whRes] = await Promise.all([
        fetch(`/api/products?id=${productId}`),
        fetch(`/api/warehouse?limit=100`),
      ]);

      const prodJson = await prodRes.json();
      const whJson = await whRes.json();

      setProduct(prodJson.product || prodJson.products?.[0] || null);
      setWarehouses(whJson.warehouses || []);

      // initialize rows with existing inventory
      if (prodJson.product && prodJson.product.inventory) {
        setRows(prodJson.product.inventory.map((inv: any) => ({ warehouseId: inv.warehouseId, quantity: inv.quantityAvailable || 0, minStockLevel: inv.reorderPoint || 0, maxStockLevel: inv.reorderQuantity || 0, binLocation: inv.binLocation || "" })));
      }
    } catch (error) {
      console.error("Failed to load product or warehouses", error);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => setRows(prev => [...prev, { warehouseId: "", quantity: 0, minStockLevel: 0, maxStockLevel: 0, binLocation: "" }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouses: rows }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/admin/products/${productId}`);
      } else {
        console.error("Save error", data);
        alert(data.error || "Failed to save distribution");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save distribution");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-2xl">Distribute Stock — {product?.name}</h2>
        <div>
          <button onClick={() => router.back()} className="text-gray-300 mr-2">Back</button>
          <button onClick={handleSave} disabled={saving} className="bg-[#f08c17] text-black px-4 py-2 rounded">{saving ? 'Saving...' : 'Save Distribution'}</button>
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4">
        {rows.map((r, idx) => (
          <div key={idx} className="grid grid-cols-6 gap-2 items-end mb-2">
            <div className="col-span-2">
              <label className="text-gray-300 text-sm">Warehouse</label>
              <select value={r.warehouseId} onChange={(e) => setRows(prev => prev.map((row, i) => i === idx ? { ...row, warehouseId: e.target.value } : row))} className="w-full px-2 py-2 bg-black border border-gray-600 rounded text-white">
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-300 text-sm">Quantity</label>
              <input type="number" min={0} value={r.quantity} onChange={(e) => setRows(prev => prev.map((row, i) => i === idx ? { ...row, quantity: parseInt(e.target.value || '0') } : row))} className="w-full px-2 py-2 bg-black border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label className="text-gray-300 text-sm">Min</label>
              <input type="number" min={0} value={r.minStockLevel} onChange={(e) => setRows(prev => prev.map((row, i) => i === idx ? { ...row, minStockLevel: parseInt(e.target.value || '0') } : row))} className="w-full px-2 py-2 bg-black border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label className="text-gray-300 text-sm">Max</label>
              <input type="number" min={0} value={r.maxStockLevel} onChange={(e) => setRows(prev => prev.map((row, i) => i === idx ? { ...row, maxStockLevel: parseInt(e.target.value || '0') } : row))} className="w-full px-2 py-2 bg-black border border-gray-600 rounded text-white" />
            </div>
            <div className="flex items-center">
              <button onClick={() => removeRow(idx)} className="text-red-400">Remove</button>
            </div>
          </div>
        ))}

        <div className="mt-4">
          <button onClick={addRow} className="bg-gray-800 text-white px-3 py-1 rounded">Add Row</button>
        </div>

        <div className="mt-4 text-gray-300">Total distributed: <strong>{rows.reduce((s, r) => s + Number(r.quantity || 0), 0)}</strong></div>
      </div>
    </div>
  );
}
