"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import EditCustomerModal from "@/components/EditCustomerModal";

interface Address {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  customerNotes?: string;
  lifetimeValue?: number;
  orderCount?: number;
  status?: string;
  tags?: string[];
  createdAt: string;
  addresses?: Address[];
  orders?: OrderSummary[];
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    params.then(p => setCustomerId(p.id));
  }, [params]);

  const fetchCustomer = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ customer: CustomerDetail }>(`/api/customers/${customerId}`);
      if (response.ok && response.data) {
        setCustomer(response.data.customer);
      } else {
        setError(response.error || "Failed to load customer");
      }
    } catch (err: any) {
      console.error("Failed to fetch customer:", err);
      setError(err.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    fetchCustomer();
  }, [customerId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-400">Loading customer...</div>
    </div>
  );

  if (error || !customer) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-red-400 text-4xl mb-2">⚠️</div>
        <div>{error || 'Customer not found'}</div>
        <button className="mt-4 text-[#f08c17]" onClick={() => router.push('/customers')}>Back</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
          <div className="text-gray-400">{customer.email} • {customer.phone || 'N/A'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEditModal(true)} className="bg-[#f08c17] text-black px-4 py-2 rounded">Edit</button>
          <button onClick={() => router.push('/customers')} className="px-4 py-2 text-gray-300">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <p className="text-gray-300"><strong>Status:</strong> {customer.status}</p>
            <p className="text-gray-300"><strong>Created:</strong> {new Date(customer.createdAt).toLocaleString()}</p>
            <p className="text-gray-300 mt-3"><strong>Notes:</strong><br />{customer.customerNotes || '—'}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Orders</h2>
            {customer.orders && customer.orders.length > 0 ? (
              <ul className="space-y-2">
                {customer.orders.map(o => (
                  <li key={o.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">#{o.orderNumber}</div>
                      <div className="text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString()} • {o.status}</div>
                    </div>
                    <div className="text-white">${o.total.toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-400">No orders found for this customer.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Addresses</h2>
            {customer.addresses && customer.addresses.length > 0 ? (
              <ul className="space-y-3">
                {customer.addresses.map(a => (
                  <li key={a.id} className="text-gray-300">
                    {a.addressLine1}<br />{a.city}, {a.state} {a.postalCode}<br />{a.countryCode}
                    {a.isDefault && <div className="text-sm text-yellow-300">Default</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-400">No addresses saved</div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="text-gray-300">Orders: {customer.orderCount || 0}</div>
            <div className="text-gray-300">Lifetime Value: ${(customer.lifetimeValue || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
        <EditCustomerModal
          isOpen={showEditModal}
          customerId={customer?.id ?? null}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); fetchCustomer(); }}
        />
    </div>
  );
}
