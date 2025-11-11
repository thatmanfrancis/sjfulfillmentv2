"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Attempt {
  id: string;
  status: string;
  eta: string | null;
  comments?: string | null;
  order: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
    shippingAddress?: any;
  };
}

export default function AssignedToMePage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callOrderId, setCallOrderId] = useState("");
  const [callCustomerId, setCallCustomerId] = useState("");
  const [callOutcome, setCallOutcome] = useState("VERIFIED");
  const [callNotes, setCallNotes] = useState("");
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateAttemptId, setDelegateAttemptId] = useState("");
  const [colleagues, setColleagues] = useState<Array<any>>([]);
  const [selectedColleague, setSelectedColleague] = useState("");

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/delivery-attempts/assigned-to-me`);
      if (!res.ok) throw new Error(res.error || "Failed to fetch attempts");
      setAttempts(res.data.attempts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch attempts");
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  const openCallModal = (orderId: string, customerId: string) => {
    setCallOrderId(orderId);
    setCallCustomerId(customerId);
    setCallOutcome("VERIFIED");
    setCallNotes("");
    setShowCallModal(true);
  };

  const openDelegateModal = async (attemptId: string, state?: string) => {
    setDelegateAttemptId(attemptId);
    setSelectedColleague("");
    try {
      const res = await fetch(`/api/logistics/colleagues?state=${encodeURIComponent(state || "")}`);
      const data = await res.json();
      setColleagues(data.colleagues || []);
      setShowDelegateModal(true);
    } catch (err) {
      alert('Failed to load colleagues');
    }
  };

  const submitCall = async () => {
    try {
      if (!callOrderId || !callCustomerId) return alert("Missing order or customer");
      const res = await api.post(`/api/orders/${callOrderId}/call-logs`, {
        customerId: callCustomerId,
        outcome: callOutcome,
        notes: callNotes,
      });
      if (!res.ok) throw new Error(res.error || "Failed to create call log");
      setShowCallModal(false);
      fetchAttempts();
      alert("Call log created");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create call log");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assigned Deliveries</h1>
        <p className="text-gray-400">Delivery attempts assigned to you</p>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ETA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No assigned delivery attempts</td>
                </tr>
              ) : (
                attempts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 text-white">{a.order.orderNumber}</td>
                    <td className="px-6 py-4 text-gray-300">{a.eta ? new Date(a.eta).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-white">{a.order.customer.firstName} {a.order.customer.lastName}</td>
                    <td className="px-6 py-4 text-gray-300">{a.status}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a href={`/orders/${a.order.id}`} className="text-[#f08c17]">View Order</a>
                        <button onClick={() => openCallModal(a.order.id, a.order.customer.id)} className="text-blue-400">Log Call</button>
                        <button onClick={() => openDelegateModal(a.id, a.order?.shippingAddress?.state)} className="text-yellow-400">Delegate</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-black border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-3">Log Call</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Outcome</label>
                <select value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded mt-1 text-white">
                  <option value="VERIFIED">Verified</option>
                  <option value="NO_ANSWER">No Answer</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">Notes</label>
                <textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded mt-1 text-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCallModal(false)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={submitCall} className="px-4 py-2 bg-[#f08c17] rounded">Create Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-black border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-3">Delegate Delivery</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Select colleague</label>
                <select value={selectedColleague} onChange={(e) => setSelectedColleague(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-600 rounded mt-1 text-white">
                  <option value="">-- choose --</option>
                  {colleagues.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.activeCount}/{c.capacity} active</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDelegateModal(false)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={async () => {
                  if (!selectedColleague) return alert('Select colleague');
                  try {
                    const res = await fetch(`/api/delivery-attempts/${delegateAttemptId}/delegate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: selectedColleague }) });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Failed');
                    alert('Delegation requested');
                    setShowDelegateModal(false);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to delegate');
                  }
                }} className="px-4 py-2 bg-[#f08c17] rounded">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
