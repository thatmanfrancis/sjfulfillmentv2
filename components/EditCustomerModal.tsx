"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import AlertModal from "./AlertModal";
import { api } from "@/lib/api";

interface EditCustomerModalProps {
  isOpen: boolean;
  customerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCustomerModal({ isOpen, customerId, onClose, onSuccess }: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", customerNotes: "", status: "ACTIVE", tags: [] as string[] });
  const [alert, setAlert] = useState({ isOpen: false, title: "", message: "", type: "info" as "success" | "error" | "warning" | "info" });

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomer();
    }
  }, [isOpen, customerId]);

  const fetchCustomer = async () => {
    setLoadingCustomer(true);
    try {
      const response = await api.get<{ customer: any }>(`/api/customers/${customerId}`);
      if (response.ok && response.data) {
        const c = response.data.customer;
        setForm({
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          email: c.email || "",
          phone: c.phone || "",
          customerNotes: c.customerNotes || "",
          status: c.status || "ACTIVE",
          tags: c.tags || [],
        });
      } else {
        setAlert({ isOpen: true, title: "Error", message: response.error || "Failed to load customer", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setAlert({ isOpen: true, title: "Error", message: "Failed to load customer", type: "error" });
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setLoading(true);
    try {
      const response = await api.put(`/api/customers/${customerId}`, form as any);
      if (response.ok) {
        setAlert({ isOpen: true, title: "Success", message: "Customer updated", type: "success" });
        setTimeout(() => {
          setAlert({ isOpen: false, title: "", message: "", type: "info" });
          onSuccess();
          onClose();
        }, 900);
      } else {
        setAlert({ isOpen: true, title: "Error", message: response.error || "Failed to update", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setAlert({ isOpen: true, title: "Error", message: "Failed to update", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={customerId ? "Edit Customer" : "Edit Customer"} size="md">
        {loadingCustomer ? (
          <div className="p-6 text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300">First Name</label>
                <input value={form.firstName} onChange={(e)=>setForm(prev=>({...prev, firstName: e.target.value}))} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" required />
              </div>
              <div>
                <label className="text-sm text-gray-300">Last Name</label>
                <input value={form.lastName} onChange={(e)=>setForm(prev=>({...prev, lastName: e.target.value}))} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" required />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300">Email</label>
              <input value={form.email} onChange={(e)=>setForm(prev=>({...prev, email: e.target.value}))} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" required />
            </div>
            <div>
              <label className="text-sm text-gray-300">Phone</label>
              <input value={form.phone} onChange={(e)=>setForm(prev=>({...prev, phone: e.target.value}))} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-300">Notes</label>
              <textarea value={form.customerNotes} onChange={(e)=>setForm(prev=>({...prev, customerNotes: e.target.value}))} className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300">Cancel</button>
              <button type="submit" disabled={loading} className="bg-[#f08c17] text-black px-4 py-2 rounded">{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
      </Modal>

      <AlertModal isOpen={alert.isOpen} onClose={()=>setAlert({...alert,isOpen:false})} title={alert.title} message={alert.message} type={alert.type} />
    </>
  );
}
