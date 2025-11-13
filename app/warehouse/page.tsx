"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { authClient } from "@/lib/auth-client";

type Wh = {
  id: string;
  name: string;
  code: string;
  isShared?: boolean;
  merchant?: { businessName?: string } | null;
  address?: { line1?: string; city?: string } | null;
  status?: string;
};

export default function WarehousePage() {
  const { user } = useAuth();



  type Warehouse = {
    id: string;
    name: string;
    code: string;
    isShared?: boolean;
    status?: string;
    merchant?: { id: string; businessName?: string } | null;
    address?: { line1?: string; city?: string } | null;
    capacity?: number | null;
    stats?: {
      totalUnits?: number;
      availableUnits?: number;
      reservedUnits?: number;
      capacity?: number;
      utilizationPercentage?: number;
    } | null;
  };

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [isShared, setIsShared] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  const resetForm = () => {
    setName("");
    setCode("");
    setCapacity(null);
    setIsShared(false);
    setMsg(null);
    setMsgType(null);
  };

  // load when page / pageSize / debounced search changes
  useEffect(() => { loadWarehouses(); }, [page, pageSize, debouncedSearch]);

  // debounce searchTerm -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  async function loadWarehouses() {
    setLoading(true);
    try {
      const token = authClient.getAccessToken();
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));

      const url = `/api/warehouse?${params.toString()}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list: Warehouse[] = data.warehouses || data || [];
      const totalCount = typeof data.total === 'number' ? data.total : (list.length || 0);
      setTotal(totalCount);

      // fetch stats for each warehouse in parallel and merge
      const statsPromises = list.map(async (w) => {
        try {
          const sRes = await fetch(`/api/warehouse/${w.id}/stats`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          if (!sRes.ok) return { id: w.id, stats: null };
          const sJson = await sRes.json();
          return { id: w.id, stats: sJson.stats || null };
        } catch (err) {
          return { id: w.id, stats: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);

      const merged = list.map((w) => {
        const s = statsResults.find((r) => r.id === w.id);
        return {
          ...w,
          capacity: s?.stats?.capacity ?? (w as any).capacity ?? null,
          stats: s?.stats ?? null,
        } as Warehouse;
      });

      setWarehouses(merged);
    } catch (error) {
      console.error(error);
      setMsg("Failed to load warehouses");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  }

  const createWarehouse = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!name || !code) {
      setMsg("Name and code are required");
      setMsgType("error");
      return;
    }

    setLoadingCreate(true);
    try {
      const token = authClient.getAccessToken();
      const url = editingId ? `/api/warehouse/${editingId}` : "/api/warehouse";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name, code, capacity, isShared }) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Create failed"); setMsgType("error"); return; }
      setMsg(editingId ? "Warehouse updated" : "Warehouse created");
      setMsgType("success");
      setShowCreateModal(false);
      setEditingId(null);
      resetForm();
      await loadWarehouses();
    } catch (error) {
      console.error(error);
      setMsg("Create failed");
      setMsgType("error");
    } finally { setLoadingCreate(false); }
  };

  function openEdit(w: Warehouse) {
    setEditingId(w.id);
    setName(w.name || "");
    setCode(w.code || "");
    // preserve existing capacity when editing
    setCapacity(typeof w.capacity === 'number' ? w.capacity : (w.stats?.capacity ?? null));
    setIsShared(!!w.isShared);
    setMsg(null);
    setMsgType(null);
    setShowCreateModal(true);
  }

  function beginDelete(w: Warehouse) { setDeleteTarget(w); setShowDeleteModal(true); setMsg(null); setMsgType(null); }

  async function confirmDelete() {
    if (!deleteTarget) return; setLoading(true);
    try {
      const token = authClient.getAccessToken();
      const res = await fetch(`/api/warehouse/${deleteTarget.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.error || 'Failed to delete warehouse'); setMsgType('error'); return; }
      setShowDeleteModal(false); setDeleteTarget(null); await loadWarehouses(); setMsg('Warehouse deleted'); setMsgType('success');
    } catch (err) { console.error(err); setMsg('Failed to delete warehouse'); setMsgType('error'); } finally { setLoading(false); }
  }

  const msgCls = msgType === "success" ? "bg-emerald-600 text-black" : "bg-red-700 text-white";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Warehouse Management</h1>
          <p className="text-gray-400">Create and manage warehouses</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={searchTerm}
            onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
            placeholder="Search warehouses..."
            className="bg-black border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-400"
          />
          <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }} className="bg-black border border-gray-700 rounded px-2 py-2 text-white">
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <button onClick={() => loadWarehouses()} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Refresh</button>
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-[#f08c17] text-black px-4 py-2 rounded-lg">+ New Warehouse</button>
        </div>
      </div>

      {/* pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {total > 0 ? (
            <>Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}</>
          ) : (
            <span>No results</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50">Prev</button>
          <div className="text-sm text-gray-300">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
          <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50">Next</button>
        </div>
      </div>

      {msg && <div className={`p-3 rounded ${msgCls}`}>{msg}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-black border border-gray-700 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-full mt-2" />
                <div className="mt-3 flex gap-2">
                  <div className="h-6 w-16 bg-gray-700 rounded" />
                  <div className="h-6 w-16 bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </>
        ) : warehouses.length === 0 ? (
          <div className="col-span-2 p-6 bg-black border border-gray-700 rounded-lg text-gray-400">No warehouses found</div>
        ) : (
          warehouses.map((w) => (
            <div key={w.id} className="bg-black border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-semibold">{w.name}</div>
                  <div className="text-sm text-gray-400">Code: {w.code}</div>
                  <div className="text-sm text-gray-400">{w.isShared ? 'Shared' : w.merchant?.businessName || 'Private'}</div>
                </div>
                <div className="text-sm text-gray-400">{w.status || 'ACTIVE'}</div>
              </div>
              {w.address && (<div className="mt-2 text-sm text-gray-400">{w.address.line1 || ''}{w.address.city ? `, ${w.address.city}` : ''}</div>)}
              {/* Capacity and utilization with visual progress bar */}
              {(() => {
                const cap = (w.capacity ?? w.stats?.capacity) ?? null;
                const occupied = w.stats?.totalUnits ?? 0;
                const spaceLeft = cap !== null ? cap - occupied : null;
                const utilization = cap && cap > 0 ? Math.round((occupied / cap) * 100) : null;
                
                // Determine color based on utilization
                const getUtilizationColor = (util: number) => {
                  if (util >= 90) return "bg-red-500";
                  if (util >= 75) return "bg-orange-500";
                  if (util >= 50) return "bg-yellow-500";
                  return "bg-green-500";
                };

                return (
                  <div className="mt-3 text-sm text-gray-300">
                    {cap !== null ? (
                      <div className="mb-2 space-y-2">
                        <div className="flex justify-between">
                          <span>Capacity: <span className="font-medium text-white">{cap}</span></span>
                          <span className="font-medium text-white">{utilization}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${getUtilizationColor(utilization || 0)} transition-all duration-300`}
                            style={{ width: `${Math.min(utilization || 0, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Used: <span className="font-medium text-white">{occupied}</span></span>
                          <span>Available: <span className="font-medium text-white">{spaceLeft}</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 text-gray-500">Capacity: not set</div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(w)} className="px-2 py-1 bg-gray-800 rounded text-sm text-white" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => beginDelete(w)} className="px-2 py-1 bg-red-700 rounded text-sm text-white" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowCreateModal(false); setEditingId(null); }} />
          <div className="bg-black border border-gray-700 rounded-lg p-4 w-11/12 max-w-md z-10">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold">{editingId ? 'Edit Warehouse' : 'Create Warehouse'}</h4>
              <button className="text-gray-400" onClick={() => { setShowCreateModal(false); setEditingId(null); }}>Close</button>
            </div>
            <form onSubmit={createWarehouse} className="space-y-3">
              <div>
                <label className="text-sm text-gray-300">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Code</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm text-gray-300">Capacity</label>
                  <input type="number" value={capacity ?? ''} onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Shared</label>
                  <div>
                    <label className="inline-flex items-center text-sm text-gray-300">
                      <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="mr-2" /> Shared
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={loadingCreate} className="bg-[#f08c17] px-3 py-2 rounded text-black font-medium">{loadingCreate ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save' : 'Create')}</button>
                <button type="button" onClick={() => { resetForm(); setShowCreateModal(false); setEditingId(null); }} className="px-3 py-2 rounded border border-gray-700 text-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-black border border-gray-700 rounded-lg p-4 w-11/12 max-w-md z-10">
            <h4 className="text-white font-semibold mb-2">Delete Warehouse</h4>
            <p className="text-gray-300 mb-4">Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="bg-red-700 px-3 py-2 rounded text-white">Yes, delete</button>
              <button onClick={() => setShowDeleteModal(false)} className="px-3 py-2 rounded border border-gray-700 text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
