"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface TrackingEvent {
  id: string;
  eventTime: string;
  description: string;
  location?: string | null;
}

interface Shipment {
  id: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  order: {
    orderNumber: string;
    customer: {
      firstName: string;
      lastName: string;
    };
    shippingAddress?: any;
  };
  trackingEvents?: TrackingEvent[];
}

export default function TrackShipmentPage() {
  const router = useRouter();
  // useParams from next/navigation returns object — but in app router, we can use URL to get param
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // derive tracking number from location
    const path = window.location.pathname;
    const parts = path.split("/");
    const trackingNumber = parts[parts.length - 1];
    if (!trackingNumber) {
      setError("No tracking number provided");
      setLoading(false);
      return;
    }

    const fetchTracking = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/shipments/track/${trackingNumber}`);
        if (!res.ok) throw new Error(res.error || "Failed to fetch tracking");
        setShipment(res.data.shipment);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tracking");
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!shipment) return <div className="p-6 text-gray-400">No shipment found</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tracking: {shipment.trackingNumber}</h1>
        <div className="text-gray-400">Carrier: {shipment.carrier || "N/A"}</div>
        <div className="text-gray-400">Status: {shipment.status.replace(/_/g, ' ')}</div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Shipment Events</h2>
        {shipment.trackingEvents && shipment.trackingEvents.length > 0 ? (
          <ul className="space-y-3">
            {shipment.trackingEvents.map(ev => (
              <li key={ev.id} className="p-3 bg-gray-900 rounded">
                <div className="text-sm text-gray-300">{new Date(ev.eventTime).toLocaleString()}</div>
                <div className="text-white font-medium">{ev.description}</div>
                {ev.location && <div className="text-gray-400 text-sm">{ev.location}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400">No tracking events available</div>
        )}
      </div>

      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Order</h2>
        <div className="text-white">{shipment.order.orderNumber}</div>
        <div className="text-gray-400">Customer: {shipment.order.customer.firstName} {shipment.order.customer.lastName}</div>
      </div>
    </div>
  );
}
