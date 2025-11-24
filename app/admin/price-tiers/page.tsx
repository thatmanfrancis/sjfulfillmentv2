"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import CreateTierModal from "@/components/admin/CreateTierModal";

interface PricingTier {
  id: string;
  merchantId?: string;
  serviceType: string;
  baseRate: number;
  negotiatedRate: number;
  rateUnit: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  Business?: any;
}

export default function AdminPriceTiersPage() {
    const [editTier, setEditTier] = useState<PricingTier | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  const fetchPricingTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/price-tiers");
      const data = await res.json();
      setPricingTiers(data.pricingTiers || []);
    } catch (error) {
      console.error("Failed to fetch pricing tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const calculateDiscountPercentage = (baseRate: number, negotiatedRate: number) => {
    if (!baseRate || !negotiatedRate || baseRate === 0) return 0;
    return Math.round(((baseRate - negotiatedRate) / baseRate) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTiers = pricingTiers.filter((tier) => {
    const serviceType = tier.serviceType || "";
    const matchesSearch = serviceType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Price Tiers</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 min-h-screen space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Price Tiers</h1>
          <p className="text-gray-300 text-lg">Manage pricing structures and discount tiers for merchants.</p>
        </div>
        <Button
          className="flex items-center gap-2 bg-[#f8c017] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#f8c017]/90 transition-colors"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create Tier
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search pricing tiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-gray-700 text-white"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-700 rounded-md bg-[#1a1a1a] text-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTiers.map((tier) => {
          const discountPercent = calculateDiscountPercentage(tier.baseRate, tier.negotiatedRate);
          return (
            <Card key={tier.id} className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700 hover:border-[#f8c017]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#f8c017]/10">
              <CardHeader>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold text-white mb-2">{tier.serviceType}</span>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">{tier.currency}</Badge>
                  </div>
                </div>
                <div className="text-gray-400">Base Rate: <span className="text-white font-semibold">{tier.baseRate}</span> {tier.rateUnit}</div>
                <div className="text-gray-400">Negotiated Rate: <span className="text-[#f8c017] font-semibold">{tier.negotiatedRate}</span> {tier.rateUnit}</div>
                <div className="text-gray-400">Merchant: <span className="text-white font-semibold">{tier.Business?.name || 'All Merchants'}</span></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {discountPercent > 0 ? (
                      <Badge className="bg-green-100 text-green-800">-{discountPercent}% discount</Badge>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-800">No discount</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">Created: <span className="text-white font-medium">{formatDate(tier.createdAt)}</span></div>
                  <div className="text-sm text-gray-400">Updated: <span className="text-white font-medium">{formatDate(tier.updatedAt)}</span></div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-[#f8c017] text-[#f8c017]"
                      onClick={() => setEditTier(tier)}
                    >
                      Edit
                    </Button>
                    <button
                      className="ml-2 flex items-center gap-1 text-[#f8c017] hover:text-white"
                      onClick={() => setSelectedTier(tier)}
                      title="View Details"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Details Modal */}
            {/* Edit Modal */}
            {editTier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                <div className="bg-[#1a1a1a] border-gray-700 max-w-3xl w-full rounded-lg p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">Edit Price Tier</h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const payload = {
                        id: editTier.id,
                        serviceType: formData.get('serviceType'),
                        baseRate: parseFloat(formData.get('baseRate') as string),
                        negotiatedRate: parseFloat(formData.get('negotiatedRate') as string),
                        rateUnit: formData.get('rateUnit'),
                        currency: editTier.currency,
                      };
                      const res = await fetch(`/api/admin/price-tiers/${editTier.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      if (res.ok) {
                        setEditTier(null);
                        fetchPricingTiers();
                      } else {
                        // Optionally show error
                      }
                    }}
                    className="space-y-6"
                  >
                    <div className="mb-4">
                      <label className="text-white mb-2 block">Service Type <span className="text-[#f8c017]">*</span></label>
                      <input name="serviceType" defaultValue={editTier.serviceType} className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white" required />
                    </div>
                    <div className="mb-4">
                      <label className="text-white mb-2 block">Rate Unit <span className="text-[#f8c017]">*</span></label>
                      <input name="rateUnit" defaultValue={editTier.rateUnit} className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white" required />
                    </div>
                    <div className="mb-4">
                      <label className="text-white mb-2 block">Base Rate <span className="text-[#f8c017]">*</span> {editTier.currency && <span className="text-xs text-[#f8c017]">({editTier.currency})</span>}</label>
                      <input name="baseRate" type="number" step="0.01" defaultValue={editTier.baseRate} className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white" required />
                    </div>
                    <div className="mb-4">
                      <label className="text-white mb-2 block">Negotiated Rate <span className="text-[#f8c017]">*</span> {editTier.currency && <span className="text-xs text-[#f8c017]">({editTier.currency})</span>}</label>
                      <input name="negotiatedRate" type="number" step="0.01" defaultValue={editTier.negotiatedRate} className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white" required />
                    </div>
                    <div className="mb-4">
                      <label className="text-white mb-2 block">Currency</label>
                      <input name="currency" value={editTier.currency || ''} className="w-full p-2 rounded bg-[#232323] border border-gray-700 text-white" disabled />
                    </div>
                    <div className="flex justify-end mt-6 gap-2">
                      <Button type="button" onClick={() => setEditTier(null)} className="bg-gray-700 text-white">Cancel</Button>
                      <Button type="submit" className="bg-[#f8c017] text-black">Save</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#232323] rounded-lg p-8 max-w-lg w-full border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Tier Details</h2>
            <div className="space-y-2">
              <div><span className="font-semibold text-white">ID:</span> <span className="text-[#f8c017]">{selectedTier.id}</span></div>
              <div><span className="font-semibold text-white">Service Type:</span> <span className="text-[#f8c017]">{selectedTier.serviceType}</span></div>
              <div><span className="font-semibold text-white">Base Rate:</span> <span className="text-[#f8c017]">{selectedTier.baseRate}</span> {selectedTier.currency}</div>
              <div><span className="font-semibold text-white">Negotiated Rate:</span> <span className="text-[#f8c017]">{selectedTier.negotiatedRate}</span> {selectedTier.currency}</div>
              <div><span className="font-semibold text-white">Rate Unit:</span> <span className="text-[#f8c017]">{selectedTier.rateUnit}</span></div>
              <div><span className="font-semibold text-white">Currency:</span> <span className="text-[#f8c017]">{selectedTier.currency}</span></div>
              <div><span className="font-semibold text-white">Merchant:</span> <span className="text-white">{selectedTier.Business?.name || 'All Merchants'}</span></div>
              <div><span className="font-semibold text-white">Created At:</span> <span className="text-gray-400">{formatDate(selectedTier.createdAt)}</span></div>
              <div><span className="font-semibold text-white">Updated At:</span> <span className="text-gray-400">{formatDate(selectedTier.updatedAt)}</span></div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setSelectedTier(null)} className="bg-[#f8c017] text-black">Close</Button>
            </div>
          </div>
        </div>
      )}

      {filteredTiers.length === 0 && (
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold text-white mb-2">No pricing tiers found</h3>
            <p className="text-gray-400 text-center">
              {searchQuery || selectedStatus !== "all"
                ? "Try adjusting your filters"
                : "Create your first pricing tier to get started."}
            </p>
          </CardContent>
        </Card>
      )}

      <CreateTierModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={fetchPricingTiers} />
    </div>
  );
}
