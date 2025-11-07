"use client";

import { useState } from "react";
import Modal from "./Modal";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [formData, setFormData] = useState({
    type: "individual", // individual or business
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    taxId: "",
    addresses: [
      {
        type: "billing",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
        isDefault: true,
      }
    ],
    preferences: {
      currency: "USD",
      paymentTerms: "net-30",
      creditLimit: 0,
      taxExempt: false,
    },
    notes: "",
    tags: [] as string[],
    status: "active",
  });
  
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          type: "individual",
          firstName: "",
          lastName: "",
          company: "",
          email: "",
          phone: "",
          website: "",
          taxId: "",
          addresses: [
            {
              type: "billing",
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "US",
              isDefault: true,
            }
          ],
          preferences: {
            currency: "USD",
            paymentTerms: "net-30",
            creditLimit: 0,
            taxExempt: false,
          },
          notes: "",
          tags: [],
          status: "active",
        });
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          type: "shipping",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "US",
          isDefault: false,
        }
      ]
    }));
  };

  const removeAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  const updateAddress = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => 
        i === index ? { ...addr, [field]: value } : addr
      )
    }));
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Customer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Type */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Customer Type</h4>
          
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="customerType"
                value="individual"
                checked={formData.type === "individual"}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="mr-2 text-[#f08c17]"
              />
              <span className="text-gray-300">Individual</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="customerType"
                value="business"
                checked={formData.type === "business"}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="mr-2 text-[#f08c17]"
              />
              <span className="text-gray-300">Business</span>
            </label>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Basic Information</h4>
          
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

          {formData.type === "business" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
              <input
                type="text"
                required={formData.type === "business"}
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Company name"
              />
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tax ID</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="Tax identification number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-medium border-b border-gray-700 pb-2">Addresses</h4>
            <button
              type="button"
              onClick={addAddress}
              className="bg-[#f08c17] text-black px-3 py-1 rounded text-sm hover:bg-orange-500 transition-colors"
            >
              Add Address
            </button>
          </div>

          {formData.addresses.map((address, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <h5 className="text-gray-300">
                    {address.type === "billing" ? "Billing Address" : `Address ${index + 1}`}
                  </h5>
                  <select
                    value={address.type}
                    onChange={(e) => updateAddress(index, "type", e.target.value)}
                    className="px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  >
                    <option value="billing">Billing</option>
                    <option value="shipping">Shipping</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                {formData.addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAddress(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => updateAddress(index, "street", e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => updateAddress(index, "city", e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => updateAddress(index, "state", e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => updateAddress(index, "zipCode", e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="ZIP Code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                  <select
                    value={address.country}
                    onChange={(e) => updateAddress(index, "country", e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={address.isDefault}
                    onChange={(e) => updateAddress(index, "isDefault", e.target.checked)}
                    className="mr-2 text-[#f08c17]"
                  />
                  <span className="text-gray-300">Default address</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Business Preferences */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Business Preferences</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Currency</label>
              <select
                value={formData.preferences.currency}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, currency: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
              <select
                value={formData.preferences.paymentTerms}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, paymentTerms: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              >
                <option value="due-on-receipt">Due on Receipt</option>
                <option value="net-15">Net 15</option>
                <option value="net-30">Net 30</option>
                <option value="net-60">Net 60</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Credit Limit</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.preferences.creditLimit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, creditLimit: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                id="taxExempt"
                checked={formData.preferences.taxExempt}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, taxExempt: e.target.checked }
                }))}
                className="mr-2 text-[#f08c17]"
              />
              <label htmlFor="taxExempt" className="text-gray-300">Tax exempt</label>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Tags</h4>
          
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
          <h4 className="text-white font-medium border-b border-gray-700 pb-2">Notes</h4>
          
          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}