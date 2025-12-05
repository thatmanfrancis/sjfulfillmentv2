"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import CreateTierModal from "@/components/admin/CreateTierModal";
import EditTierModal from "@/components/admin/EditTierModal";
import { get, del } from "@/lib/api";
import { DialogContent } from "@/components/ui/dialog";
import {
  Dialog,
  // DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define a type for price tier group
type PriceTierOffering = {
  id: string;
  serviceType: string;
  baseRate: number;
  negotiatedRate: number;
  rateUnit?: string;
  currency: string;
  discountPercent?: number;
};
type PriceTierGroup = {
  id: string;
  name?: string;
  description?: string;
  offerings: PriceTierOffering[];
  totalBaseRate: number;
  totalNegotiatedRate: number;
};

export default function PriceTiersPage() {
  const [editTier, setEditTier] = useState<any | null>(null);
  const [deleteTier, setDeleteTier] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [priceTierGroups, setPriceTierGroups] = useState<PriceTierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierGroup, setSelectedTierGroup] =
    useState<PriceTierGroup | null>(null);
  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPriceTierGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filteredGroups: PriceTierGroup[] = priceTierGroups.filter((group) => {
    if (!searchQuery) return true;
    return (
      (group.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  const fetchPriceTierGroups = async () => {
    setLoading(true);
    try {
      // If API supports pagination, pass page & pageSize
      const data = await get<{
        priceTiers: PriceTierGroup[];
        totalCount?: number;
      }>(`/api/admin/price-tiers?page=${page}&pageSize=${pageSize}`);
      setPriceTierGroups(data.priceTiers || []);
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (error) {
      console.error("Failed to fetch price tier groups:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black p-6 min-h-screen">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Price Tiers</h1>
            <p className="text-gray-300 text-lg">
              Manage pricing structures and discount tiers for merchants.
            </p>
          </div>
          <Button
            className="flex items-center gap-2 bg-[#f8c017] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#f8c017]/90 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create Tier
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search pricing tiers by name, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Table or Empty State */}
        {loading ? (
          <div className="w-full flex flex-col gap-4 mt-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-700 rounded animate-pulse w-full"
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="w-full max-w-3xl mx-auto border-2 border-[#f08c17] rounded-lg bg-[#181818] min-h-80 flex flex-col justify-center items-center py-12 px-4 mt-8">
            <h3 className="text-lg font-semibold text-white mb-2">
              No price tiers found
            </h3>
            <p className="text-gray-400 text-center">
              {searchQuery
                ? "Try adjusting your filters"
                : "Create your first price tier to get started."}
            </p>
          </div>
        ) : (
          <div className="w-full mt-8">
            <table className="w-full text-sm text-left border border-[#f08c17] rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-[#222] text-[#f8c017]">
                  <th className="p-2 whitespace-nowrap">Name</th>
                  <th className="p-2 whitespace-nowrap">Packages</th>
                  <th className="p-2 whitespace-nowrap">Base Rate</th>
                  <th className="p-2 whitespace-nowrap">Negotiated Rate</th>
                  <th className="p-2 whitespace-nowrap">Currency</th>
                  <th className="p-2 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    className="border-b border-[#f08c17]/10 hover:bg-[#222] transition"
                  >
                    <td className="p-2 text-white whitespace-nowrap max-w-[200px] truncate align-middle">
                      {group.name || group.description}
                    </td>
                    <td className="p-2 text-white whitespace-nowrap">
                      {group.offerings.length}
                    </td>
                    <td className="p-2 text-white whitespace-nowrap">
                      {group.totalBaseRate}
                    </td>
                    <td className="p-2 text-white whitespace-nowrap">
                      {group.totalNegotiatedRate}
                    </td>
                    <td className="p-2 text-white whitespace-nowrap">
                      {group.offerings[0]?.currency || "-"}
                    </td>
                    <td className="p-2 text-center flex gap-2 justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="View details"
                        onClick={() => setSelectedTierGroup(group)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[#f8c017]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit tier"
                        onClick={() => setEditTier(group)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 20h9"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16.5 3.5a2.121 2.121 0 113 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                          />
                        </svg>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete tier"
                        onClick={() => setDeleteTier(group)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Edit Modal */}
            {editTier && (
              <Dialog
                open={!!editTier}
                onOpenChange={(open) => {
                  if (!open) setEditTier(null);
                }}
              >
                <DialogContent className="max-w-2xl bg-[#181818] text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      Edit Price Tier
                    </DialogTitle>
                  </DialogHeader>
                  <div>
                    <EditTierModal
                      open={!!editTier}
                      onOpenChange={(open: boolean) => {
                        if (!open) setEditTier(null);
                      }}
                      tier={editTier}
                      onUpdated={() => {
                        setEditTier(null);
                        fetchPriceTierGroups();
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Delete Modal */}
            {deleteTier && (
              <Dialog
                open={!!deleteTier}
                onOpenChange={(open) => {
                  if (!open) setDeleteTier(null);
                }}
              >
                <DialogContent className="max-w-md bg-[#181818] text-white">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-red-400">
                      Delete Price Tier Group
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mb-4">
                    Are you sure you want to delete
                    <span className="font-semibold text-[#f8c017]">
                      {deleteTier?.name || deleteTier?.description}
                    </span>
                    ? This action cannot be undone.
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => setDeleteTier(null)}
                      className="bg-gray-700 text-white"
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await del(`/api/admin/price-tiers/${deleteTier.id}`);
                          setDeleteTier(null);
                          fetchPriceTierGroups();
                        } catch (error: any) {
                          console.error("Failed to delete tier:", error);
                          // Optionally show error
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      className="bg-red-600 text-white"
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex justify-center items-center mt-6 gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  size="sm"
                  className="bg-[#f8c017] text-black"
                >
                  Prev
                </Button>
                <span className="text-white">
                  Page {page} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  disabled={page >= Math.ceil(totalCount / pageSize)}
                  onClick={() => setPage(page + 1)}
                  size="sm"
                  className="bg-[#f8c017] text-black"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal for detailed group view */}
        <Dialog
          open={!!selectedTierGroup}
          onOpenChange={(open) => {
            if (!open) setSelectedTierGroup(null);
          }}
        >
          <DialogContent className="max-w-2xl bg-[#181818] text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedTierGroup?.name || selectedTierGroup?.description}
              </DialogTitle>
            </DialogHeader>
            {selectedTierGroup && (
              <>
                <div className="mb-4">
                  <div className="text-gray-400">
                    Packages:{" "}
                    <span className="text-white font-semibold">
                      {selectedTierGroup.offerings?.length ?? 0}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    Total Base Rate:{" "}
                    <span className="text-white font-semibold">
                      {selectedTierGroup.totalBaseRate}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    Total Negotiated Rate:{" "}
                    <span className="text-white font-semibold">
                      {selectedTierGroup.totalNegotiatedRate}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    Description:{" "}
                    <span className="text-white font-semibold">
                      {selectedTierGroup.description}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-[#222] text-[#f8c017]">
                        <th className="p-2 whitespace-nowrap">Service Type</th>
                        <th className="p-2 whitespace-nowrap">Base Rate</th>
                        <th className="p-2 whitespace-nowrap">
                          Negotiated Rate
                        </th>
                        <th className="p-2 whitespace-nowrap">Rate Unit</th>
                        <th className="p-2 whitespace-nowrap">Currency</th>
                        <th className="p-2 whitespace-nowrap">Discount (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedTierGroup.offerings ?? []).map((pkg) => (
                        <tr
                          key={pkg.id}
                          className="border-b border-[#f08c17]/10"
                        >
                          <td className="p-2 text-white whitespace-nowrap max-w-40 truncate">
                            {pkg.serviceType}
                          </td>
                          <td className="p-2 text-white whitespace-nowrap">
                            {pkg.baseRate}
                          </td>
                          <td className="p-2 text-white whitespace-nowrap">
                            {pkg.negotiatedRate}
                          </td>
                          <td className="p-2 text-white whitespace-nowrap">
                            {pkg.rateUnit}
                          </td>
                          <td className="p-2 text-white whitespace-nowrap">
                            {pkg.currency}
                          </td>
                          <td className="p-2 text-white whitespace-nowrap">
                            {pkg.discountPercent ?? "-"}{" "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <CreateTierModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={() => fetchPriceTierGroups()}
        />
      </div>
    </div>
  );
}
