"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import api from "@/lib/api";
import AlertModal from "@/components/AlertModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateShipmentModal({ isOpen, onClose, onCreated }: Props) {
  const [orderId, setOrderId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [weight, setWeight] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return setMsg("Order ID is required");

    const payload = {
      orderId,
      carrier: carrier || null,
      trackingNumber: trackingNumber || null,
      serviceLevel: serviceLevel || null,
      weight: weight || null,
      shippingCost: shippingCost || null,
    };

    const res = await api.post("/api/shipments", payload);
    if (!res.ok) {
      setMsgType("error");
      setMsg(res.error || "Failed to create shipment");
      return;
    }

    // Prefer tracking number returned by API
    const returnedTracking = res.data?.shipment?.trackingNumber || res.data?.trackingNumber;
    setMsgType("success");
    setMsg(returnedTracking ? `Shipment created — tracking: ${returnedTracking}` : "Shipment created");
    // reset form
    setOrderId("");
    setCarrier("");
    setTrackingNumber("");
    setServiceLevel("");
    setWeight(0);
    setShippingCost(0);
    onCreated?.();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Shipment" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-400">Order ID</label>
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div>
          <label className="text-sm text-gray-400">Carrier</label>
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div>
          <label className="text-sm text-gray-400">Tracking Number</label>
          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
          <p className="text-xs text-gray-500 mt-1">Leave blank to have the system generate a tracking number automatically.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Service Level</label>
            <input value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Weight</label>
            <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Shipping Cost</label>
          <input type="number" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value))} className="w-full mt-1 p-2 bg-black border border-gray-700 rounded text-white" />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-700 text-white">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-[#f08c17] text-black">Create</button>
        </div>
      </form>

      <AlertModal isOpen={!!msg} onClose={() => setMsg(null)} message={msg || ""} type={msgType === "success" ? "success" : "error"} />
    </Modal>
  );
}
