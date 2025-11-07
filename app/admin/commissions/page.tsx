"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

interface Commission {
  id: string;
  merchant: {
    id: string;
    businessName: string;
    businessEmail: string;
  };
  totalCollected: number;
  totalRemitted: number;
  pendingBalance: number;
  platformFee: number;
  merchantEarnings: number;
  commissionRate: number;
  lastRemittanceAt: string | null;
  recentRemittances: {
    id: string;
    amount: number;
    date: string;
    method: string;
    reference: string;
    processedBy: string;
  }[];
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Commission | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [currentPage]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/commissions?page=${currentPage}`);
      if (!response.ok) throw new Error("Failed to fetch commissions");
      
      setCommissions(response.data.balances);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.totalCount);
    } catch (err) {
      setError("Failed to load commission data");
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    if (!selectedMerchant) return;
    
    try {
      setProcessing(true);
      const response = await api.post("/api/admin/commissions", {
        merchantId: selectedMerchant.merchant.id,
        amount: parseFloat(payoutAmount),
        paymentMethod,
        referenceNumber,
        notes: `Payout to ${selectedMerchant.merchant.businessName}`
      });

      if (!response.ok) throw new Error("Failed to process payout");

      await fetchCommissions();
      setShowPayoutModal(false);
      setSelectedMerchant(null);
      setPayoutAmount("");
      setReferenceNumber("");
    } catch (err) {
      setError("Failed to process payout");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Commission Management</h1>
        <p className="text-gray-400">Manage merchant commissions and payouts</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">
            {formatCurrency(commissions.reduce((sum, c) => sum + c.totalCollected, 0))}
          </div>
          <div className="text-sm text-gray-400">Total Collected</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(commissions.reduce((sum, c) => sum + c.platformFee, 0))}
          </div>
          <div className="text-sm text-gray-400">Platform Fees</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {formatCurrency(commissions.reduce((sum, c) => sum + c.totalRemitted, 0))}
          </div>
          <div className="text-sm text-gray-400">Total Remitted</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {formatCurrency(commissions.reduce((sum, c) => sum + c.pendingBalance, 0))}
          </div>
          <div className="text-sm text-gray-400">Pending Payouts</div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Collected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Platform Fee (2.5%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Pending Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No commission data found
                  </td>
                </tr>
              ) : (
                commissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {commission.merchant.businessName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {commission.merchant.businessEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatCurrency(commission.totalCollected)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatCurrency(commission.platformFee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        commission.pendingBalance > 0 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {formatCurrency(commission.pendingBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {commission.lastRemittanceAt 
                        ? new Date(commission.lastRemittanceAt).toLocaleDateString()
                        : "Never"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMerchant(commission);
                            setPayoutAmount(commission.pendingBalance.toString());
                            setShowPayoutModal(true);
                          }}
                          disabled={commission.pendingBalance <= 0}
                          className="text-[#f08c17] hover:text-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          💰 Payout
                        </button>
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          📊 History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={20}
        totalItems={totalCount}
        onPageChange={setCurrentPage}
      />

      {/* Payout Modal */}
      {showPayoutModal && selectedMerchant && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowPayoutModal(false)}></div>
            
            <div className="inline-block align-bottom bg-black rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-700">
              <div>
                <h3 className="text-lg leading-6 font-medium text-white mb-4">
                  Process Payout - {selectedMerchant.merchant.businessName}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      max={selectedMerchant.pendingBalance}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {formatCurrency(selectedMerchant.pendingBalance)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="PAYPAL">PayPal</option>
                      <option value="STRIPE">Stripe</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      placeholder="TXN123456789"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayout}
                  disabled={processing || !payoutAmount || !referenceNumber}
                  className="flex-1 bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Process Payout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}