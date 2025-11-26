import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { PricingTier } from "@/types";
import { useState, useEffect } from "react";

type TierPackage = {
  serviceType: string;
  baseRate: string;
  negotiatedRate: string;
  discountPercent?: string;
  rateUnit: string;
  minimumOrderQuantity?: string;
  maximumOrderQuantity?: string;
  features?: string;
  applicableRegions?: string;
  validFrom?: string;
  validTo?: string;
};

export default function CreateTierModal({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (newTier?: PricingTier) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ description: string; currency: string; packages: TierPackage[] }>(
    {
      description: "",
      currency: "",
      packages: [
        {
          serviceType: "",
          baseRate: "",
          negotiatedRate: "",
          discountPercent: "",
          rateUnit: "per_kg",
          minimumOrderQuantity: "",
          maximumOrderQuantity: "",
          features: "",
          applicableRegions: "",
          validFrom: "",
          validTo: ""
        }
      ]
    }
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="text-white">Create Price Tier</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setCreating(true);
            try {
              // Only send fields allowed by backend schema
              const allowed = [
                "serviceType",
                "baseRate",
                "negotiatedRate",
                "rateUnit",
                "currency",
                "merchantId",
                "discountPercent"
              ];
              const cleanPackage = (pkg: TierPackage) => {
                const cleaned: any = {};
                cleaned.serviceType = pkg.serviceType;
                cleaned.baseRate = parseFloat(pkg.baseRate);
                cleaned.negotiatedRate = parseFloat(pkg.negotiatedRate);
                cleaned.rateUnit = pkg.rateUnit;
                // Always include currency from form
                cleaned.currency = form.currency;
                if (pkg.discountPercent && pkg.discountPercent !== "") {
                  cleaned.discountPercent = parseFloat(pkg.discountPercent);
                }
                // Only include allowed fields
                Object.keys(cleaned).forEach(key => {
                  if (!allowed.includes(key) || cleaned[key] === undefined || cleaned[key] === "") {
                    delete cleaned[key];
                  }
                });
                return cleaned;
              };
              const payload = {
                description: form.description,
                currency: form.currency,
                packages: form.packages.map(cleanPackage)
              };
              console.log("[CreateTierModal] Submitting payload:", payload);
              const res = await fetch("/api/admin/price-tiers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error("Failed to create tier(s)");
              if (onCreated) onCreated();
              onOpenChange(false);
              setForm({
                description: "",
                currency: "",
                packages: [
                  {
                    serviceType: "",
                    baseRate: "",
                    negotiatedRate: "",
                    discountPercent: "",
                    rateUnit: "per_kg",
                    minimumOrderQuantity: "",
                    maximumOrderQuantity: "",
                    features: "",
                    applicableRegions: "",
                    validFrom: "",
                    validTo: ""
                  }
                ]
              });
            } catch (err) {
              // Optionally show error
            } finally {
              setCreating(false);
            }
          }}
          className="space-y-6"
        >
          {/* ...existing code... */}
          <div className="mb-4">
            <Label className="text-white mb-2 block">Currency <span className="text-[#f8c017]">*</span></Label>
            <select
              required
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white"
            >
              <option value="">Select currency</option>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="mb-4">
            <Label className="text-white mb-2 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-[#232323] border-gray-700 text-white"
            />
          </div>
          <div className="mb-4">
            <Label className="text-white mb-2 block">Packages & Prices</Label>
            {form.packages.map((pkg, idx) => (
              <div key={idx} className="flex flex-wrap gap-4 mb-2">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-white mb-1 block">Service Type <span className="text-[#f8c017]">*</span></Label>
                  <Input
                    required
                    value={pkg.serviceType}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, serviceType: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Rate Unit <span className="text-[#f8c017]">*</span></Label>
                  <Input
                    required
                    value={pkg.rateUnit}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, rateUnit: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Base Rate <span className="text-[#f8c017]">*</span> {form.currency && <span className="text-xs text-[#f8c017]">({form.currency})</span>}</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={pkg.baseRate}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, baseRate: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                    disabled={!form.currency}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Negotiated Rate <span className="text-[#f8c017]">*</span> {form.currency && <span className="text-xs text-[#f8c017]">({form.currency})</span>}</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={pkg.negotiatedRate}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, negotiatedRate: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                    disabled={!form.currency}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Discount (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pkg.discountPercent ?? ""}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, discountPercent: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                {/* Collapsible advanced options */}
                <div className="flex-1 min-w-[120px]">
                  <details>
                    <summary className="cursor-pointer text-[#f8c017]">Show advanced options</summary>
                    <div className="mt-2 space-y-2">
                      <Label className="text-white mb-1 block">Min Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={pkg.minimumOrderQuantity}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, minimumOrderQuantity: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                      <Label className="text-white mb-1 block">Max Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={pkg.maximumOrderQuantity}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, maximumOrderQuantity: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                      <Label className="text-white mb-1 block">Features</Label>
                      <Input
                        value={pkg.features}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, features: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                      <Label className="text-white mb-1 block">Regions</Label>
                      <Input
                        value={pkg.applicableRegions}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, applicableRegions: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                      <Label className="text-white mb-1 block">Valid From</Label>
                      <Input
                        type="date"
                        value={pkg.validFrom}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, validFrom: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                      <Label className="text-white mb-1 block">Valid To</Label>
                      <Input
                        type="date"
                        value={pkg.validTo}
                        onChange={e => setForm(f => ({
                          ...f,
                          packages: f.packages.map((p, i) => i === idx ? { ...p, validTo: e.target.value } : p)
                        }))}
                        className="bg-[#232323] border-gray-700 text-white"
                      />
                    </div>
                  </details>
                </div>
                <div className="flex items-center">
                  {form.packages.length > 1 && (
                    <Button type="button" size="sm" className="ml-2 bg-red-600 text-white" onClick={() => setForm(f => ({
                      ...f,
                      packages: f.packages.filter((_, i) => i !== idx)
                    }))}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" size="sm" className="mt-2 bg-[#f8c017] text-black" onClick={() => setForm(f => ({
              ...f,
              packages: [...f.packages, {
                serviceType: "",
                baseRate: "",
                negotiatedRate: "",
                discountPercent: "",
                rateUnit: "per_kg",
                minimumOrderQuantity: "",
                maximumOrderQuantity: "",
                features: "",
                applicableRegions: "",
                validFrom: "",
                validTo: ""
              }]
            }))}>
              Add Package
            </Button>
          </div>
          {/* All extra fields are now per-package only, not at form level */}
          <DialogFooter>
            <Button type="submit" disabled={creating} className="bg-[#f8c017] text-black font-semibold">
              {creating ? "Creating..." : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
