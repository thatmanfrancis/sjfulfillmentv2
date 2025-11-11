"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditShipmentModal from "@/components/EditShipmentModal";
import ReassignModal from "@/components/ReassignModal";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const router = useRouter();

  async function load() {
    if (!shipmentId) return;
    setLoading(true);
    const res = await api.get(`/api/shipments/${shipmentId}`);
    if (res.ok) setShipment(res.data?.shipment || res.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!params) return;
    (params as Promise<{ id: string }>).then(p => setShipmentId(p.id));
  }, [params]);

  useEffect(() => { load(); }, [shipmentId]);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!shipment) return <div className="p-6 text-gray-400">Shipment not found</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Shipment {shipment.id}</h1>
        <div className="flex gap-2">
          {user?.role === "ADMIN" && (
            <button onClick={() => setShowReassign(true)} className="px-4 py-2 rounded bg-blue-600 text-white">Reassign</button>
          )}
          <button onClick={() => setEditOpen(true)} className="px-4 py-2 rounded bg-[#f08c17] text-black">Edit</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded bg-gray-700 text-white">Back</button>
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm text-gray-400">Order</h4>
            <div className="text-white">{shipment.order?.orderNumber || shipment.orderId}</div>
          </div>
          <div>
            <h4 className="text-sm text-gray-400">Status</h4>
            <div className="text-white">{shipment.status}</div>
          </div>
          <div>
            <h4 className="text-sm text-gray-400">Carrier</h4>
            <div className="text-white">{shipment.carrier || '-'}</div>
          </div>
          <div>
            <h4 className="text-sm text-gray-400">Tracking</h4>
            <div className="text-white">{shipment.trackingNumber || '-'}</div>
          </div>
        </div>
      </div>

  <EditShipmentModal isOpen={editOpen} onClose={() => setEditOpen(false)} shipmentId={shipment?.id} onSaved={() => { setEditOpen(false); load(); }} />
  <ReassignModal isOpen={showReassign} onClose={() => setShowReassign(false)} orderId={shipment?.order?.id || shipment?.orderId} state={shipment?.order?.shippingAddress?.state} onReassigned={() => load()} />
    </div>
  );
}
