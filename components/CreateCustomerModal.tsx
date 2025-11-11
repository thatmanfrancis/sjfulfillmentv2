"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { useAuth } from "@/lib/auth-context";
import AlertModal from "./AlertModal";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Merchant {
  id: string;
  businessName: string;
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [formData, setFormData] = useState({
    merchantId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    customerNotes: "",
    tags: [] as string[],
    customFields: {} as Record<string, any>,
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
  });

  // Fetch merchants when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMerchants();
    }
  }, [isOpen]);

  const fetchMerchants = async () => {
    setLoadingMerchants(true);
    try {
      const { api } = await import("@/lib/api");
      const response = await api.get<{ merchants: Merchant[] }>("/api/merchants");
      
      if (response.ok && response.data) {
        const merchantsList = response.data.merchants || [];
        setMerchants(merchantsList);
        
        // If user is merchant, auto-select their merchant
        if (user?.role === "MERCHANT" && merchantsList.length > 0) {
          setFormData(prev => ({
            ...prev,
            merchantId: merchantsList[0].id,
          }));
        }
      } else {
        setAlertModal({
          isOpen: true,
          title: "Error",
          message: response.error || "Failed to load merchants",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to fetch merchants:", error);
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Failed to load merchants. Please try again.",
        type: "error",
      });
    } finally {
      setLoadingMerchants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.merchantId) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "Please select a merchant",
        type: "warning",
      });
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "First name and last name are required",
        type: "warning",
      });
      return;
    }

    if (!formData.email.trim()) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "Email is required",
        type: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const { api } = await import("@/lib/api");
      const response = await api.post("/api/customers", formData);

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          title: "Success",
          message: `Customer ${formData.firstName} ${formData.lastName} created successfully!`,
          type: "success",
        });
        
        // Reset form
        setFormData({
          merchantId: user?.role === "MERCHANT" ? formData.merchantId : "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          customerNotes: "",
          tags: [],
          customFields: {},
        });
        
        setTimeout(() => {
          setAlertModal({ isOpen: false, title: "", message: "", type: "info" });
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setAlertModal({
          isOpen: true,
          title: "Error",
          message: response.error || "Failed to create customer",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Create New Customer" size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Merchant Selection */}
          {user?.role === "ADMIN" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Merchant *</label>
              {loadingMerchants ? (
                <div className="text-gray-400 text-sm">Loading merchants...</div>
              ) : (
                <select
                  required
                  value={formData.merchantId}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchantId: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                >
                  <option value="">Select a merchant</option>
                  {merchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.businessName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-white font-medium border-b border-gray-700 pb-2">Customer Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-white font-medium border-b border-gray-700 pb-2">Tags (Optional)</h4>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Enter tag name"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-[#f08c17] text-black px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-white font-medium border-b border-gray-700 pb-2">Notes (Optional)</h4>
            
            <div>
              <textarea
                value={formData.customerNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Additional notes about this customer..."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingMerchants}
              className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}