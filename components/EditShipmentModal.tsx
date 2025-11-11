"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import api from "@/lib/api";
import AlertModal from "@/components/AlertModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string | null;
  onSaved?: () => void;
}

export default function EditShipmentModal({ isOpen, onClose, shipmentId, onSaved }: Props) {
  const [shipment, setShipment] = useState<any | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!isOpen || !shipmentId) return;
    (async () => {
      const res = await api.get(`/api/shipments/${shipmentId}`);
      if (res.ok) {
        setShipment(res.data?.shipment || res.data);
        setTrackingNumber(res.data?.shipment?.trackingNumber || res.data?.trackingNumber || "");
        setCarrier(res.data?.shipment?.carrier || res.data?.carrier || "");
        setServiceLevel(res.data?.shipment?.serviceLevel || res.data?.serviceLevel || "");
      } else {
        setMsgType("error");
        setMsg(res.error || "Failed to load shipment");
      }
    })();
  }, [isOpen, shipmentId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!shipmentId) return;
    const payload = { trackingNumber, carrier, serviceLevel };
    const res = await api.put(`/api/shipments/${shipmentId}`, payload);
    if (!res.ok) {
      setMsgType("error");
      setMsg(res.error || "Failed to save");
      return;
    }
    setMsgType("success");
    setMsg("Saved");
    onSaved?.();
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={shipment ? `Edit Shipment ${shipment.id}` : "Edit Shipment"} size="md">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm text-gray-400">Tracking Number</label>
          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div>
          <label className="text-sm text-gray-400">Carrier</label>
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div>
          <label className="text-sm text-gray-400">Service Level</label>
          <input value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-700 text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-[#f08c17] text-black">Save</button>
        </div>
      </form>

      <AlertModal isOpen={!!msg} onClose={() => setMsg(null)} message={msg || ""} type={msgType === "success" ? "success" : "error"} />
    </Modal>
  );
}
