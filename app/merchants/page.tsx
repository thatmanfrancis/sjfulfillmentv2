"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import CreateMerchantModal from "@/components/CreateMerchantModal";
import ConfirmModal from "@/components/ConfirmModal";
import EditMerchantModal from "@/components/EditMerchantModal";

interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  joinedDate: string;
  lastActive: string;
  currency?: {
    code: string;
    symbol: string;
  };
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchMerchants();
    (async ()=>{
      const me = await api.get("/api/users/me");
      if (me.ok && me.data?.user) {
        setCurrentUser(me.data.user);
      }
    })();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await api.get("/api/merchants");
      if (response.ok && response.data) {
        setMerchants(response.data.merchants || []);
      }
    } catch (error) {
      console.error("Failed to fetch merchants:", error);
    } finally {
      setLoading(false);
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const router = useRouter();
  const [confirmMerchantId, setConfirmMerchantId] = useState<string | null>(null);
  const [editingMerchantId, setEditingMerchantId] = useState<string | null>(null);

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         merchant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "suspended": return "bg-red-100 text-red-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const deleteMerchant = async (id: string) => {
    try {
      const res = await api.delete(`/api/merchants/${id}`);
      if (res.ok) {
        // refresh list
        fetchMerchants();
        setConfirmMerchantId(null);
      } else {
        alert(res.error || 'Failed to delete merchant');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete merchant');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Merchants</h1>
          <p className="text-gray-400">Manage merchant partners and their businesses</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors">
            Export
          </button>
          {currentUser?.role === "ADMIN" ? (
            <>
              <button onClick={()=>setModalOpen(true)} className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
                Add Merchant
              </button>
              <CreateMerchantModal open={modalOpen} onClose={()=>setModalOpen(false)} onCreated={(m)=>{ fetchMerchants(); }} />
            </>
          ) : (
            <button disabled className="bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-medium">Add Merchant</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search merchants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Merchants Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No merchants found
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{merchant.businessName}</div>
                      <div className="text-xs text-gray-400">
                        Joined {new Date(merchant.joinedDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{merchant.ownerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{merchant.email}</div>
                      <div className="text-sm text-gray-400">{merchant.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                      {merchant.totalProducts ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {merchant.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      ${((merchant.totalRevenue ?? 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {merchant.currency?.code || 'USD'} {merchant.currency?.symbol || '$'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(merchant.status)}`}>
                        {merchant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => router.push(`/merchants/${merchant.id}`)} className="text-[#f08c17] hover:text-orange-500 transition-colors">
                          View
                        </button>
                        <button onClick={() => setEditingMerchantId(merchant.id)} className="text-blue-400 hover:text-blue-300 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setConfirmMerchantId(merchant.id)} className="text-red-500 hover:text-red-400 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">{merchants.length}</div>
          <div className="text-sm text-gray-400">Total Merchants</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {merchants.filter(m => m.status === "active").length}
          </div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {merchants.reduce((sum, m) => sum + (m.totalProducts ?? 0), 0)}
          </div>
          <div className="text-sm text-gray-400">Total Products</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            ${merchants.reduce((sum, m) => sum + (m.totalRevenue ?? 0), 0).toFixed(0)}
          </div>
          <div className="text-sm text-gray-400">Total Revenue</div>
        </div>
      </div>
      {/* Confirmation and edit modals */}
      <ConfirmModal open={!!confirmMerchantId} title="Delete merchant" message={confirmMerchantId ? `Are you sure you want to delete this merchant?` : undefined} onCancel={()=>setConfirmMerchantId(null)} onConfirm={()=> confirmMerchantId && deleteMerchant(confirmMerchantId)} />
      <EditMerchantModal open={!!editingMerchantId} merchantId={editingMerchantId} onClose={()=>setEditingMerchantId(null)} onSaved={(m)=>{ fetchMerchants(); setEditingMerchantId(null); }} />
    </div>
  );
}