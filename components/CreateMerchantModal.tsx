"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (merchant: any) => void;
}

export default function CreateMerchantModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerHighlighted, setOwnerHighlighted] = useState<number>(-1);
  const ownerAbortRef = useRef<AbortController | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [taxId, setTaxId] = useState("");
  const [currencyId, setCurrencyId] = useState<string | null>(null);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const resp = await api.get<{ currencies: any[] }>("/api/currencies");
      if (resp.ok && resp.data) {
        // api returns array directly or { currencies }
        const data = resp.data?.currencies ?? resp.data;
        setCurrencies(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setCurrencyId(data[0].id);
        }
      }
    })();
    // reset owner selection when modal opens
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
    setOwnerHighlighted(-1);
  }, [open]);

  const handleCreate = async () => {
    setLoading(true);
    try {

      // If admin selected an owner via autocomplete, use that; otherwise fall back to current user.
      let ownerUserId = selectedOwner?.id;
      if (!ownerUserId) {
        const me = await api.get("/api/users/me");
        if (!me.ok) {
          alert(me.error || "Unable to fetch current user");
          setLoading(false);
          return;
        }
        ownerUserId = me.data?.user?.id;
      }

      if (!ownerUserId) {
        alert("No user available to set as owner");
        setLoading(false);
        return;
      }

      const payload: any = {
        businessName,
        businessEmail,
        businessPhone,
        ownerUserId,
        currencyId,
        timezone,
        websiteUrl,
        taxId,
      };

      if (subscriptionPrice !== undefined && !isNaN(Number(subscriptionPrice))) {
        payload.subscriptionPrice = Number(subscriptionPrice);
      }

      const res = await api.post("/api/merchants", payload);
      if (res.ok && res.data) {
        onCreated?.(res.data.merchant);
        onClose();
      } else {
        alert(res.error || "Failed to create merchant");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create merchant");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-black border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create Merchant</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-300 block mb-1">Owner (search by name or email)</label>
            <input
              value={ownerQuery}
              onChange={(e)=>{
                const q = e.target.value;
                setOwnerQuery(q);
                // clear selected owner when typing new query
                if (selectedOwner) setSelectedOwner(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOwnerHighlighted((h) => Math.min(h + 1, ownerResults.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setOwnerHighlighted((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  if (ownerHighlighted >= 0 && ownerHighlighted < ownerResults.length) {
                    const u = ownerResults[ownerHighlighted];
                    setSelectedOwner(u);
                    setOwnerQuery(`${u.firstName || ''} ${u.lastName || ''} <${u.email}>`);
                    setOwnerResults([]);
                    setOwnerHighlighted(-1);
                  }
                } else if (e.key === "Escape") {
                  setOwnerResults([]);
                  setOwnerHighlighted(-1);
                }
              }}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
              placeholder="Search users by name or email"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  // immediate search
                  const q = ownerQuery.trim();
                  if (!q) return setOwnerResults([]);
                  // cancel previous
                  ownerAbortRef.current?.abort();
                  ownerAbortRef.current = new AbortController();
                  setOwnerLoading(true);
                  try {
                    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { signal: ownerAbortRef.current.signal });
                    if (res.ok) {
                      const json = await res.json();
                      setOwnerResults(json.users || []);
                    } else {
                      setOwnerResults([]);
                    }
                  } catch (err) {
                    if ((err as any)?.name === 'AbortError') return;
                    setOwnerResults([]);
                  } finally {
                    setOwnerLoading(false);
                  }
                }}
                className="px-3 py-1 bg-gray-800 rounded text-white"
              >Search</button>
              <button
                type="button"
                onClick={() => { setOwnerQuery(""); setOwnerResults([]); setSelectedOwner(null); setOwnerHighlighted(-1); }}
                className="px-3 py-1 bg-gray-700 rounded text-gray-300"
              >Clear</button>
              {selectedOwner && (
                <button type="button" onClick={() => { setSelectedOwner(null); setOwnerQuery(""); }} className="px-3 py-1 bg-red-700 rounded text-white">Remove selection</button>
              )}
            </div>
            {ownerResults.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-auto border border-gray-700 rounded bg-black">
                {ownerResults.map((u, i) => (
                  <li
                    key={u.id}
                    onMouseEnter={() => setOwnerHighlighted(i)}
                    onClick={()=>{ setSelectedOwner(u); setOwnerQuery(`${u.firstName || ''} ${u.lastName || ''} <${u.email}>`); setOwnerResults([]); setOwnerHighlighted(-1); }}
                    className={`px-3 py-2 cursor-pointer text-white ${i === ownerHighlighted ? 'bg-gray-800' : ''}`}
                  >
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </li>
                ))}
                {ownerResults.length === 0 && <li className="px-3 py-2 text-gray-400">No users found</li>}
              </ul>
            )}
            {ownerLoading && <div className="text-sm text-gray-400 mt-1">Searching...</div>}
            {selectedOwner && <div className="text-sm text-gray-400 mt-1">Selected owner: {selectedOwner.firstName} {selectedOwner.lastName} ({selectedOwner.email})</div>}
          </div>

          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Business name" value={businessName} onChange={e=>setBusinessName(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Business email" value={businessEmail} onChange={e=>setBusinessEmail(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Phone" value={businessPhone} onChange={e=>setBusinessPhone(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Timezone" value={timezone} onChange={e=>setTimezone(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Website URL" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Tax ID" value={taxId} onChange={e=>setTaxId(e.target.value)} />
          <div>
            <label className="text-sm text-gray-300">Currency</label>
            <select className="w-full mt-1 px-3 py-2 bg-black border border-gray-600 rounded text-white" value={currencyId ?? ""} onChange={e=>setCurrencyId(e.target.value)}>
              {currencies.map(c=> (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300">Subscription price ({currencies.find(c=>c.id===currencyId)?.code ?? ""})</label>
            <input className="w-full mt-1 px-3 py-2 bg-black border border-gray-600 rounded text-white" type="number" step="0.01" value={subscriptionPrice ?? ""} onChange={e=>setSubscriptionPrice(e.target.value === "" ? undefined : Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-4 py-2 rounded bg-[#f08c17] text-black font-medium" onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create Merchant"}</button>
        </div>
      </div>
    </div>
  );
}
