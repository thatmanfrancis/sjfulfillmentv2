"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import AlertModal from "@/components/AlertModal";
import { api } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  state?: string | null;
  onReassigned?: () => void;
}

export default function ReassignModal({ isOpen, onClose, orderId, state, onReassigned }: Props) {
  const [colleagues, setColleagues] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success'|'error'|'info'|'warning'>('info');
  const [confirmMode, setConfirmMode] = useState(false);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/logistics/colleagues?state=${encodeURIComponent(state || "")}`);
        if (res.ok) {
          setColleagues(res.data.colleagues || []);
        } else {
          setColleagues([]);
        }
      } catch (err) {
        setColleagues([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, state]);

  const submit = async () => {
    if (!selected) return setMessage("Please select a colleague");

    // If not confirmed yet, flip to confirm mode and show colleague name
    if (!confirmMode) {
      const sel = colleagues.find((c: any) => c.id === selected);
      setConfirmName(sel ? `${sel.firstName} ${sel.lastName}` : null);
      setConfirmMode(true);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/api/orders/${orderId}/reassign`, { targetUserId: selected });
      if (!res.ok) {
        throw new Error(res.error || res.data?.error || "Failed to reassign");
      }
      setMessageType('success');
      setMessage("Reassigned successfully");
      onReassigned?.();
      // small delay so user sees success then close
      setTimeout(() => {
        setConfirmMode(false);
        setConfirmName(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || "Failed to reassign");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => {
        setConfirmMode(false);
        setConfirmName(null);
        setMessage(null);
        onClose();
      }} title="Reassign Shipment" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Select a colleague who covers the order's shipping state and has available capacity.</p>

          {loading && <div className="text-gray-400">Loading...</div>}

          {!loading && colleagues.length === 0 && (
            <div className="text-gray-400">No available colleagues for this state.</div>
          )}

          {!loading && colleagues.length > 0 && (
            <div>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white">
                <option value="">-- choose colleague --</option>
                {colleagues.map((c: any) => (
                  <option key={c.id} value={c.id} disabled={c.activeCount >= c.capacity}>
                    {c.firstName} {c.lastName} — {c.activeCount}/{c.capacity} active
                  </option>
                ))}
              </select>
            </div>
          )}

          {confirmMode && confirmName && (
            <div className="p-3 bg-gray-900 border border-gray-700 rounded">
              <div className="text-sm text-gray-300">Confirm reassign to <span className="text-white font-medium">{confirmName}</span>?</div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => {
              setConfirmMode(false);
              setConfirmName(null);
              onClose();
            }} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>

            {!confirmMode && <button onClick={submit} disabled={loading} className="px-4 py-2 bg-[#f08c17] rounded text-black">{loading ? 'Assigning...' : 'Reassign'}</button>}

            {confirmMode && (
              <>
                <button onClick={() => { setConfirmMode(false); setConfirmName(null); }} className="px-4 py-2 bg-gray-700 rounded">Back</button>
                <button onClick={submit} disabled={loading} className="px-4 py-2 bg-red-600 rounded text-white">{loading ? 'Assigning...' : 'Confirm'}</button>
              </>
            )}
          </div>
        </div>
      </Modal>

      <AlertModal isOpen={!!message} onClose={() => setMessage(null)} title={messageType === 'success' ? 'Reassigned' : 'Error'} message={message || ''} type={messageType === 'success' ? 'success' : messageType === 'error' ? 'error' : 'info'} />
    </>
  );
}
