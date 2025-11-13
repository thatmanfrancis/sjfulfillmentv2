"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ConfirmModal from "./ConfirmModal";
import EditMerchantModal from "./EditMerchantModal";
import { useRouter } from "next/navigation";

interface Props {
  merchantId: string;
}

export default function MerchantDetail({ merchantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any | null>(null);
  const [tab, setTab] = useState<string>("details");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const fetch = async () => {
    setLoading(true);
    const res = await api.get(`/api/merchants/${merchantId}`);
    if (res.ok && res.data) setMerchant(res.data.merchant);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [merchantId]);

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/api/merchants/${merchantId}`);
      if (res.ok) {
        // Show success message with product count
        const message = res.data?.message || 'Merchant deleted successfully';
        const productsArchived = res.data?.productsArchived || 0;
        
        if (productsArchived > 0) {
          alert(`${message}\n\n${productsArchived} product(s) have been archived and retained for data harvesting.`);
        }
        
        // redirect back to merchants list
        router.push('/merchants');
      } else {
        alert(res.error || 'Failed to delete merchant');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete merchant');
    }
  };

  if (loading) return <div className="p-6 text-gray-300">Loading...</div>;
  if (!merchant) return <div className="p-6 text-gray-300">Merchant not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">{merchant.businessName}</h1>
          <div className="text-gray-400">Owner: {merchant.owner?.firstName} {merchant.owner?.lastName} — {merchant.owner?.email}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setEditOpen(true)} className="px-3 py-2 bg-gray-700 rounded text-white" title="Edit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={()=>setConfirmOpen(true)} className="px-3 py-2 bg-red-600 rounded text-white" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex gap-2">
          <button onClick={()=>setTab('details')} className={`px-3 py-2 rounded ${tab==='details' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Details</button>
          <button onClick={()=>setTab('products')} className={`px-3 py-2 rounded ${tab==='products' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Products</button>
          <button onClick={()=>setTab('staff')} className={`px-3 py-2 rounded ${tab==='staff' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Staff</button>
          <button onClick={()=>setTab('customers')} className={`px-3 py-2 rounded ${tab==='customers' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Customers</button>
          <button onClick={()=>setTab('notifications')} className={`px-3 py-2 rounded ${tab==='notifications' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Notifications</button>
          <button onClick={()=>setTab('emaillogs')} className={`px-3 py-2 rounded ${tab==='emaillogs' ? 'bg-[#f08c17] text-black' : 'bg-gray-800 text-gray-300'}`}>Email logs</button>
        </div>

        <div className="mt-4 bg-black border border-gray-700 rounded p-4 min-h-[200px]">
          {tab === 'details' && (
            <div>
              <p className="text-gray-300">Email: {merchant.businessEmail}</p>
              <p className="text-gray-300">Phone: {merchant.businessPhone}</p>
              <p className="text-gray-300">Currency: {merchant.currency?.code}</p>
              <p className="text-gray-300">Subscription price: {merchant.settings?.subscriptionPrice ?? 'N/A'}</p>
            </div>
          )}
          {tab === 'products' && (<div className="text-gray-300">Products list (placeholder)</div>)}
          {tab === 'staff' && (<div className="text-gray-300">Staff list (placeholder)</div>)}
          {tab === 'customers' && (<div className="text-gray-300">Customers list (placeholder)</div>)}
          {tab === 'notifications' && (<div className="text-gray-300">Notification preferences (placeholder)</div>)}
          {tab === 'emaillogs' && (<div className="text-gray-300">Email logs (placeholder)</div>)}
        </div>
      </div>

      <ConfirmModal 
        open={confirmOpen} 
        title="Delete Merchant" 
        message={`Are you sure you want to delete ${merchant.businessName}?\n\nAll products owned by this merchant will be archived (not permanently deleted) to preserve data for harvesting and analytics.\n\nThe merchant account will be marked as cancelled and can be restored by an admin if needed.`} 
        onCancel={()=>setConfirmOpen(false)} 
        onConfirm={async ()=>{ await handleDelete(); }} 
      />
      <EditMerchantModal open={editOpen} merchantId={merchantId} onClose={()=>setEditOpen(false)} onSaved={(m)=>{ setMerchant(m); }} />
    </div>
  );
}
