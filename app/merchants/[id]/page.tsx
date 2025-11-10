"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface MerchantDetail {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  websiteUrl?: string;
  logoUrl?: string;
  taxId?: string;
  status: string;
  timezone: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  subscriptionPlan?: {
    name: string;
    billingCycle: string;
  };
  settings?: any;
  _count: {
    products: number;
    customers: number;
    orders: number;
    staff: number;
    warehouses: number;
    invoices: number;
    payments: number;
  };
  products?: any[];
  customers?: any[];
  orders?: any[];
  staff?: any[];
  warehouses?: any[];
  subscriptions?: any[];
  merchantSettings?: any[];
  notifications?: any[];
  emailLogs?: any[];
  auditLogs?: any[];
  MerchantBalance?: {
    availableBalance: number;
    pendingBalance: number;
    totalRevenue: number;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MerchantDetailPage({ params }: PageProps) {
  const [merchantId, setMerchantId] = useState<string>("");
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    params.then((p) => {
      setMerchantId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetail();
    }
  }, [merchantId]);

  const fetchMerchantDetail = async () => {
    try {
      const response = await api.get(`/api/merchants/${merchantId}`);
      if (response.ok) {
        setMerchant(response.data.merchant);
      }
    } catch (error) {
      console.error("Failed to fetch merchant:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Merchant Not Found</h1>
        <button
          onClick={() => router.push("/merchants")}
          className="bg-[#f08c17] text-black px-4 py-2 rounded-lg"
        >
          Back to Merchants
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "products", label: "Products", icon: "📦", count: merchant._count.products },
    { id: "customers", label: "Customers", icon: "👥", count: merchant._count.customers },
    { id: "orders", label: "Orders", icon: "🛒", count: merchant._count.orders },
    { id: "staff", label: "Staff", icon: "👤", count: merchant._count.staff },
    { id: "warehouses", label: "Warehouses", icon: "🏭", count: merchant._count.warehouses },
    { id: "subscription", label: "Subscription", icon: "💳" },
    { id: "financials", label: "Financials", icon: "💰" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "activity", label: "Activity", icon: "📜" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.businessName}
              className="w-20 h-20 rounded-lg border border-gray-600 object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg border border-gray-600 bg-gray-800 flex items-center justify-center">
              <span className="text-3xl text-gray-400">{merchant.businessName.charAt(0)}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{merchant.businessName}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  merchant.status === "ACTIVE"
                    ? "bg-green-900 text-green-300"
                    : merchant.status === "TRIAL"
                    ? "bg-blue-900 text-blue-300"
                    : "bg-red-900 text-red-300"
                }`}
              >
                {merchant.status}
              </span>
            </div>
            <p className="text-gray-400">{merchant.businessEmail}</p>
            <p className="text-sm text-gray-500">
              Member since {new Date(merchant.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/merchants")}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Back
          </button>
          <button className="px-4 py-2 bg-[#f08c17] text-black rounded-lg hover:bg-orange-500">
            Edit Merchant
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-[#f08c17]">{merchant._count.products}</div>
          <div className="text-sm text-gray-400">Products</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{merchant._count.customers}</div>
          <div className="text-sm text-gray-400">Customers</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{merchant._count.orders}</div>
          <div className="text-sm text-gray-400">Orders</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{merchant._count.staff}</div>
          <div className="text-sm text-gray-400">Staff</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{merchant._count.warehouses}</div>
          <div className="text-sm text-gray-400">Warehouses</div>
        </div>
        <div className="bg-black border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-pink-400">
            {merchant.MerchantBalance
              ? `${merchant.currency.symbol}${merchant.MerchantBalance.availableBalance.toFixed(2)}`
              : `${merchant.currency.symbol}0.00`}
          </div>
          <div className="text-sm text-gray-400">Balance</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-[#f08c17] border-b-2 border-[#f08c17]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Business Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">Business Name</label>
                    <p className="text-white">{merchant.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white">{merchant.businessEmail}</p>
                  </div>
                  {merchant.businessPhone && (
                    <div>
                      <label className="text-sm text-gray-400">Phone</label>
                      <p className="text-white">{merchant.businessPhone}</p>
                    </div>
                  )}
                  {merchant.websiteUrl && (
                    <div>
                      <label className="text-sm text-gray-400">Website</label>
                      <a
                        href={merchant.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#f08c17] hover:underline"
                      >
                        {merchant.websiteUrl}
                      </a>
                    </div>
                  )}
                  {merchant.taxId && (
                    <div>
                      <label className="text-sm text-gray-400">Tax ID</label>
                      <p className="text-white">{merchant.taxId}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-400">Timezone</label>
                    <p className="text-white">{merchant.timezone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Currency</label>
                    <p className="text-white">
                      {merchant.currency.name} ({merchant.currency.code}) {merchant.currency.symbol}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner & Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Owner & Address
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400">Owner</label>
                    <p className="text-white">
                      {merchant.owner.firstName || merchant.owner.lastName
                        ? `${merchant.owner.firstName || ""} ${merchant.owner.lastName || ""}`.trim()
                        : merchant.owner.email}
                    </p>
                    <p className="text-sm text-gray-400">{merchant.owner.email}</p>
                  </div>
                  {merchant.businessAddress && (
                    <div>
                      <label className="text-sm text-gray-400">Business Address</label>
                      <p className="text-white">
                        {merchant.businessAddress.street}
                        <br />
                        {merchant.businessAddress.city}, {merchant.businessAddress.state}{" "}
                        {merchant.businessAddress.postalCode}
                        <br />
                        {merchant.businessAddress.country}
                      </p>
                    </div>
                  )}
                  {merchant.subscriptionPlan && (
                    <div>
                      <label className="text-sm text-gray-400">Subscription Plan</label>
                      <p className="text-white">
                        {merchant.subscriptionPlan.name} ({merchant.subscriptionPlan.billingCycle})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Settings */}
            {merchant.settings && (
              <div>
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">
                  Merchant Settings
                </h3>
                <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                  {JSON.stringify(merchant.settings, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Products ({merchant._count.products})</h3>
            <p className="text-gray-400">Product list will be loaded here...</p>
          </div>
        )}

        {activeTab === "customers" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Customers ({merchant._count.customers})</h3>
            <p className="text-gray-400">Customer list will be loaded here...</p>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Orders ({merchant._count.orders})</h3>
            <p className="text-gray-400">Order list will be loaded here...</p>
          </div>
        )}

        {activeTab === "staff" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Staff ({merchant._count.staff})</h3>
            <p className="text-gray-400">Staff list will be loaded here...</p>
          </div>
        )}

        {activeTab === "warehouses" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Warehouses ({merchant._count.warehouses})</h3>
            <p className="text-gray-400">Warehouse list will be loaded here...</p>
          </div>
        )}

        {activeTab === "subscription" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Subscription Details</h3>
            {merchant.subscriptionPlan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <label className="text-sm text-gray-400">Plan Name</label>
                    <p className="text-white text-lg font-medium">{merchant.subscriptionPlan.name}</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <label className="text-sm text-gray-400">Billing Cycle</label>
                    <p className="text-white text-lg font-medium">{merchant.subscriptionPlan.billingCycle}</p>
                  </div>
                </div>
                {merchant.settings?.subscriptionPrice !== undefined && merchant.settings?.subscriptionPrice !== null && (
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <label className="text-sm text-gray-400">Price</label>
                    <p className="text-white text-lg font-medium">
                      {merchant.currency.symbol}{typeof merchant.settings.subscriptionPrice === 'number' 
                        ? merchant.settings.subscriptionPrice.toFixed(2) 
                        : merchant.settings.subscriptionPrice}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No subscription plan assigned.</p>
            )}
          </div>
        )}

        {activeTab === "financials" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Financial Overview</h3>
            {merchant.MerchantBalance ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900 p-6 rounded-lg">
                  <label className="text-sm text-gray-400">Available Balance</label>
                  <p className="text-2xl font-bold text-green-400 mt-2">
                    {merchant.currency.symbol}
                    {merchant.MerchantBalance.availableBalance.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-900 p-6 rounded-lg">
                  <label className="text-sm text-gray-400">Pending Balance</label>
                  <p className="text-2xl font-bold text-yellow-400 mt-2">
                    {merchant.currency.symbol}
                    {merchant.MerchantBalance.pendingBalance.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-900 p-6 rounded-lg">
                  <label className="text-sm text-gray-400">Total Revenue</label>
                  <p className="text-2xl font-bold text-[#f08c17] mt-2">
                    {merchant.currency.symbol}
                    {merchant.MerchantBalance.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No financial data available.</p>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Merchant Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <label className="text-sm text-gray-400">Status</label>
                  <p className="text-white text-lg font-medium">{merchant.status}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <label className="text-sm text-gray-400">Timezone</label>
                  <p className="text-white text-lg font-medium">{merchant.timezone}</p>
                </div>
              </div>
              {merchant.merchantSettings && merchant.merchantSettings.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-white mb-2">Additional Settings</h4>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(merchant.merchantSettings, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Activity & Logs</h3>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-2">Audit Logs</h4>
                <p className="text-gray-400 text-sm">
                  {merchant.auditLogs && merchant.auditLogs.length > 0
                    ? `${merchant.auditLogs.length} audit log entries`
                    : "No audit logs available"}
                </p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-2">Email Logs</h4>
                <p className="text-gray-400 text-sm">
                  {merchant.emailLogs && merchant.emailLogs.length > 0
                    ? `${merchant.emailLogs.length} email log entries`
                    : "No email logs available"}
                </p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-2">Notifications</h4>
                <p className="text-gray-400 text-sm">
                  {merchant.notifications && merchant.notifications.length > 0
                    ? `${merchant.notifications.length} notifications`
                    : "No notifications available"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
