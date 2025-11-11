"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AlertModal from "./AlertModal";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (merchant: any) => void;
}

export default function CreateMerchantModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [createdMerchant, setCreatedMerchant] = useState<any>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    type: "error" | "warning";
  }>({
    isOpen: false,
    message: "",
    type: "error",
  });
  
  // Owner (User) Details
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  
  // Business (Merchant) Details
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
        const data = resp.data?.currencies ?? resp.data;
        setCurrencies(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setCurrencyId(data[0].id);
        }
      }
    })();
    resetForm();
  }, [open]);

  const resetForm = () => {
    setOwnerFirstName("");
    setOwnerLastName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setBusinessName("");
    setBusinessEmail("");
    setBusinessPhone("");
    setTimezone("UTC");
    setWebsiteUrl("");
    setTaxId("");
    setSubscriptionPrice(undefined);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      // Validation
      if (!ownerFirstName || !ownerLastName || !ownerEmail) {
        setAlertModal({
          isOpen: true,
          message: "Owner first name, last name, and email are required",
          type: "warning",
        });
        setLoading(false);
        return;
      }

      if (!businessName || !businessEmail || !currencyId) {
        setAlertModal({
          isOpen: true,
          message: "Business name, email, and currency are required",
          type: "warning",
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        // Owner details
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPhone,
        // Business details
        businessName,
        businessEmail,
        businessPhone,
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
        setSuccessMessage(res.data.message || "Merchant created successfully! Verification email sent to owner.");
        setCreatedMerchant(res.data.merchant);
        setShowSuccessModal(true);
        onCreated?.(res.data.merchant);
        resetForm();
      } else {
        setAlertModal({
          isOpen: true,
          message: res.error || "Failed to create merchant",
          type: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        message: "Failed to create merchant",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSuccessMessage("");
    setCreatedMerchant(null);
    onClose();
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl bg-black border border-green-600 rounded-lg shadow-2xl">
          <div className="p-6 border-b border-green-600 bg-green-900/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Merchant Created Successfully!</h2>
                <p className="text-sm text-gray-400 mt-1">The merchant account has been set up</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300">{successMessage}</p>
            </div>

            {createdMerchant && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Business Name</p>
                    <p className="text-white font-medium">{createdMerchant.businessName}</p>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Business Email</p>
                    <p className="text-white font-medium">{createdMerchant.businessEmail}</p>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Owner Name</p>
                    <p className="text-white font-medium">
                      {createdMerchant.owner?.firstName} {createdMerchant.owner?.lastName}
                    </p>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Owner Email</p>
                    <p className="text-white font-medium">{createdMerchant.owner?.email}</p>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Currency</p>
                    <p className="text-white font-medium">
                      {createdMerchant.currency?.code} ({createdMerchant.currency?.symbol})
                    </p>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className="text-green-400 font-medium">{createdMerchant.status}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-900/20 border border-blue-700 rounded p-4">
              <p className="text-sm text-blue-300">
                <strong>📧 Next Steps:</strong>
              </p>
              <ul className="text-sm text-blue-300 mt-2 ml-4 list-disc space-y-1">
                <li>Owner will receive a verification email shortly</li>
                <li>They can login using OTP (One-Time Password)</li>
                <li>Password can be set later in account settings</li>
              </ul>
            </div>
          </div>

          <div className="p-6 border-t border-gray-700 flex justify-end">
            <button
              className="px-6 py-2 rounded bg-[#f08c17] text-black font-medium hover:bg-[#d67a14]"
              onClick={handleSuccessClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl bg-black border border-gray-700 rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold text-white">Create New Merchant</h2>
          <p className="text-sm text-gray-400 mt-1">
            Create a business account with owner details. Owner will receive login instructions via email.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Owner Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={ownerFirstName}
                  onChange={(e) => setOwnerFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={ownerLastName}
                  onChange={(e) => setOwnerLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="john@example.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Owner will login using OTP sent to this email
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="NDUKA Store"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="business@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Business Phone</label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  value={currencyId ?? ""}
                  onChange={(e) => setCurrencyId(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Cannot be changed later</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">
                  Subscription Price ({currencies.find((c) => c.id === currencyId)?.code ?? ""})
                </label>
                <input
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  type="number"
                  step="0.01"
                  value={subscriptionPrice ?? ""}
                  onChange={(e) =>
                    setSubscriptionPrice(e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  placeholder="29.99"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Timezone</label>
                <select
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Africa/Lagos">Lagos</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Tax ID</label>
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                  placeholder="Tax ID"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded p-4">
            <p className="text-sm text-blue-300">
              <strong>ℹ️ Note:</strong> The owner will receive an email with:
            </p>
            <ul className="text-sm text-blue-300 mt-2 ml-4 list-disc">
              <li>Email verification link</li>
              <li>Instructions to login using OTP (One-Time Password)</li>
              <li>Option to set a password later if preferred</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => {
              onClose();
              resetForm();
            }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-[#f08c17] text-black font-medium hover:bg-[#d67a14]"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Merchant"}
          </button>
        </div>
      </div>
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
