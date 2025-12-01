import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function EditTierModal({
  open,
  onOpenChange,
  tier,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: any;
  onUpdated: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: tier?.name || "",
    description: tier?.description || "",
    currency: tier?.currency || "",
    packages: Array.isArray(tier?.offerings)
      ? tier.offerings.map((pkg: any) => ({ ...pkg }))
      : [],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Price Tier</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setUpdating(true);
            try {
              const payload = {
                name: form.name,
                description: form.description,
                currency: form.currency,
                packages: form.packages.map((pkg: any) => ({
                  ...pkg,
                  baseRate: parseFloat(pkg.baseRate),
                  negotiatedRate: parseFloat(pkg.negotiatedRate),
                  discountPercent: pkg.discountPercent
                    ? parseFloat(pkg.discountPercent)
                    : undefined,
                })),
              };
              const res = await fetch(`/api/admin/price-tiers/${tier.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error("Failed to update tier");
              if (onUpdated) onUpdated();
              onOpenChange(false);
            } catch (err) {
              // Optionally show error
            } finally {
              setUpdating(false);
            }
          }}
          className="space-y-6"
        >
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="bg-[#232323] border-gray-700 text-white"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label className="text-white mb-2 block">Packages & Prices</Label>
            {form.packages.map((pkg: any, idx: number) => (
              <div key={pkg.id || idx} className="flex flex-wrap gap-4 mb-2">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-white mb-1 block">Service Type</Label>
                  <Input
                    required
                    value={pkg.serviceType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        packages: f.packages.map((p: any, i: number) =>
                          i === idx ? { ...p, serviceType: e.target.value } : p
                        ),
                      }))
                    }
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Rate Unit</Label>
                  <Input
                    required
                    value={pkg.rateUnit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        packages: f.packages.map((p: any, i: number) =>
                          i === idx ? { ...p, rateUnit: e.target.value } : p
                        ),
                      }))
                    }
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Base Rate</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={pkg.baseRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        packages: f.packages.map((p: any, i: number) =>
                          i === idx ? { ...p, baseRate: e.target.value } : p
                        ),
                      }))
                    }
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">
                    Negotiated Rate
                  </Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={pkg.negotiatedRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        packages: f.packages.map((p: any, i: number) =>
                          i === idx
                            ? { ...p, negotiatedRate: e.target.value }
                            : p
                        ),
                      }))
                    }
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-white mb-1 block">Discount (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pkg.discountPercent ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        packages: f.packages.map((p: any, i: number) =>
                          i === idx
                            ? { ...p, discountPercent: e.target.value }
                            : p
                        ),
                      }))
                    }
                    className="bg-[#232323] border-gray-700 text-white"
                  />
                </div>
                <div className="flex items-center">
                  {form.packages.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      className="ml-2 bg-red-600 text-white"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          packages: f.packages.filter(
                            (_: any, i: number) => i !== idx
                          ),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              className="mt-2 bg-[#f8c017] text-black"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  packages: [
                    ...f.packages,
                    {
                      serviceType: "",
                      baseRate: "",
                      negotiatedRate: "",
                      discountPercent: "",
                      rateUnit: "per_kg",
                    },
                  ],
                }))
              }
            >
              Add Package
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={updating}
              className="bg-[#f8c017] text-black font-semibold"
            >
              {updating ? "Updating..." : "Update Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
