"use client";

import { useEffect, useState } from "react";

export default function DelegationRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delegation-requests/assigned');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setRequests(data.requests || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const respond = async (id: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/delegation-requests/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      alert(data.message || (action === 'accept' ? 'Accepted' : 'Declined'));
      fetchRequests();
    } catch (err: any) {
      alert(err?.message || 'Failed to respond');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Delegation Requests</h1>
      <p className="text-gray-400 mb-4">Requests from colleagues to take over deliveries assigned to you.</p>

      {requests.length === 0 ? (
        <div className="text-gray-400">No pending requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="bg-black border border-gray-700 p-4 rounded">
              <div className="flex justify-between">
                <div>
                  <div className="text-sm text-gray-400">From: {r.fromUser?.firstName} {r.fromUser?.lastName}</div>
                  <div className="text-white font-medium">Order: {r.deliveryAttempt?.order?.orderNumber}</div>
                  <div className="text-gray-400 text-sm">Customer: {r.deliveryAttempt?.order?.customer?.firstName} {r.deliveryAttempt?.order?.customer?.lastName}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => respond(r.id, 'decline')} className="px-3 py-1 bg-gray-700 rounded">Decline</button>
                  <button onClick={() => respond(r.id, 'accept')} className="px-3 py-1 bg-[#f08c17] rounded">Accept</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
