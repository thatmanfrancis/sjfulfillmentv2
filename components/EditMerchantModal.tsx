"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Props {
  open: boolean;
  merchantId: string | null;
  onClose: () => void;
  onSaved?: (m: any) => void;
}

export default function EditMerchantModal({ open, merchantId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState<any | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    if (!open || !merchantId) return;
    (async () => {
      const res = await api.get(`/api/merchants/${merchantId}`);
      if (res.ok && res.data) {
        const m = res.data.merchant;
        setMerchant(m);
        setBusinessName(m.businessName || "");
        setBusinessEmail(m.businessEmail || "");
        setBusinessPhone(m.businessPhone || "");
        setTimezone(m.timezone || "UTC");
        setWebsiteUrl(m.websiteUrl || "");
        setTaxId(m.taxId || "");
      }
    })();
  }, [open, merchantId]);

  const handleSave = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const res = await api.put(`/api/merchants/${merchantId}`, {
        businessName,
        businessEmail,
        businessPhone,
        timezone,
        websiteUrl,
        taxId,
      });
      if (res.ok && res.data) {
        onSaved?.(res.data.merchant);
        onClose();
      } else {
        alert(res.error || "Failed to save merchant");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save merchant");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-black border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Edit Merchant</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Business name" value={businessName} onChange={e=>setBusinessName(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Business email" value={businessEmail} onChange={e=>setBusinessEmail(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Phone" value={businessPhone} onChange={e=>setBusinessPhone(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Timezone" value={timezone} onChange={e=>setTimezone(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Website URL" value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} />
          <input className="px-3 py-2 bg-black border border-gray-600 rounded text-white" placeholder="Tax ID" value={taxId} onChange={e=>setTaxId(e.target.value)} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-4 py-2 rounded bg-[#f08c17] text-black font-medium" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
