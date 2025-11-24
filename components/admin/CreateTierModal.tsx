import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function CreateTierModal({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    description: "",
    currency: "",
    merchantId: "",
    packages: [
      {
        serviceType: "",
        baseRate: "",
        negotiatedRate: "",
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
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantResults, setMerchantResults] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  useEffect(() => {
    if (merchantSearch.length < 2) {
      setMerchantResults([]);
      return;
    }
    const fetchMerchants = async () => {
      const res = await fetch(`/api/admin/businesses?search=${encodeURIComponent(merchantSearch)}`);
      const data = await res.json();
      setMerchantResults(data.businesses || []);
    };
    fetchMerchants();
  }, [merchantSearch]);

  useEffect(() => {
    if (selectedMerchant) {
      setForm(f => ({ ...f, currency: selectedMerchant.baseCurrency, merchantId: selectedMerchant.id }));
    }
  }, [selectedMerchant]);
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
              const res = await fetch("/api/admin/price-tiers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  description: form.description,
                  currency: form.currency,
                  merchantId: form.merchantId,
                  packages: form.packages.map(pkg => ({
                    serviceType: pkg.serviceType,
                    baseRate: parseFloat(pkg.baseRate),
                    negotiatedRate: parseFloat(pkg.negotiatedRate),
                    rateUnit: pkg.rateUnit,
                    minimumOrderQuantity: pkg.minimumOrderQuantity ? parseInt(pkg.minimumOrderQuantity) : undefined,
                    maximumOrderQuantity: pkg.maximumOrderQuantity ? parseInt(pkg.maximumOrderQuantity) : undefined,
                    features: pkg.features,
                    applicableRegions: pkg.applicableRegions,
                    validFrom: pkg.validFrom,
                    validTo: pkg.validTo
                  }))
                })
              });
              if (!res.ok) throw new Error("Failed to create tier(s)");
              if (onCreated) onCreated();
              onOpenChange(false);
              setForm({
                description: "",
                currency: "",
                merchantId: "",
                packages: [
                  {
                    serviceType: "",
                    baseRate: "",
                    negotiatedRate: "",
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
              setSelectedMerchant(null);
              setMerchantSearch("");
            } catch (err) {
              // Optionally show error
            } finally {
              setCreating(false);
            }
          }}
          className="space-y-6"
        >
          {/* Merchant Search & Select */}
          <div className="mb-4">
            <Label className="text-white mb-2 block">Merchant <span className="text-[#f8c017]">*</span></Label>
            <Input
              placeholder="Search merchant by name..."
              value={selectedMerchant ? selectedMerchant.name : merchantSearch}
              onChange={e => {
                setMerchantSearch(e.target.value);
                setSelectedMerchant(null);
              }}
              className="bg-[#232323] border-gray-700 text-white"
              autoComplete="off"
            />
            {merchantSearch.length > 1 && !selectedMerchant && merchantResults.length > 0 && (
              <div className="absolute z-10 bg-[#232323] border border-gray-700 rounded mt-1 w-full max-h-48 overflow-y-auto">
                {merchantResults.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="px-3 py-2 cursor-pointer hover:bg-[#f8c017]/20 text-white"
                    onClick={() => {
                      setSelectedMerchant(merchant);
                      setMerchantSearch("");
                    }}
                  >
                    <div className="font-semibold">{merchant.name}</div>
                    <div className="text-xs text-gray-400">{merchant.baseCurrency} • {merchant.city}, {merchant.country}</div>
                  </div>
                ))}
              </div>
            )}
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
                </div>
                <div className="flex-1 min-w-[120px]">
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
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-white mb-1 block">Features</Label>
                  <Input
                    value={pkg.features}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, features: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-white mb-1 block">Regions</Label>
                  <Input
                    value={pkg.applicableRegions}
                    onChange={e => setForm(f => ({
                      ...f,
                      packages: f.packages.map((p, i) => i === idx ? { ...p, applicableRegions: e.target.value } : p)
                    }))}
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
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
                </div>
                <div className="flex-1 min-w-[120px]">
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
