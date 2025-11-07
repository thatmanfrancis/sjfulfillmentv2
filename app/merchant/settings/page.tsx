"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import Image from "next/image";

export default function MerchantSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("business");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "business", name: "Business Details", icon: "🏢" },
    { id: "branding", name: "Branding", icon: "🎨" },
    { id: "preferences", name: "Preferences", icon: "⚙️" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "billing", name: "Billing", icon: "💳" },
  ];

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/users/me");
      if (response.ok && response.data?.user) {
        const userData = response.data.user;
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: userData.twoFactorEnabled || false,
        }));
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    if (enabled) {
      setShow2FAModal(true);
    } else {
      setSaving(true);
      try {
        const response = await api.post("/api/users/me/disable-2fa", {});
        
        if (response.ok) {
          setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: false }));
          setMessage("Two-factor authentication disabled successfully");
        } else {
          throw new Error(response.error || "Failed to disable 2FA");
        }
      } catch (error) {
        console.error("Failed to disable 2FA:", error);
        setMessage("Failed to disable two-factor authentication");
      } finally {
        setSaving(false);
      }
    }
  };

  const handle2FASuccess = () => {
    setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: true }));
    setMessage("Two-factor authentication enabled successfully");
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "business":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="Your Business Name"
                    defaultValue="ABC Trading Co."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="business@example.com"
                    defaultValue="contact@abctrading.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Phone *
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="+1 (555) 123-4567"
                    defaultValue="+1 (555) 987-6543"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Type
                  </label>
                  <select className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>E-commerce</option>
                    <option>Manufacturing</option>
                    <option>Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tax ID / VAT Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="123-45-6789"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Business Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="123 Business Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country *
                  </label>
                  <select className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Business Logo</h3>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    {logoPreview ? (
                      <div className="space-y-4">
                        <div className="relative w-32 h-32 mx-auto">
                          <Image
                            src={logoPreview}
                            alt="Logo preview"
                            fill
                            className="object-contain rounded-lg"
                          />
                        </div>
                        <div className="space-x-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
                          >
                            Change Logo
                          </button>
                          <button
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                            }}
                            className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-white font-medium">Upload your business logo</p>
                          <p className="text-gray-400 text-sm">PNG, JPG up to 2MB</p>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
                        >
                          Choose File
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-2">Logo Guidelines</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Recommended size: 200x200px minimum</li>
                    <li>• Square format works best</li>
                    <li>• Use PNG for transparent backgrounds</li>
                    <li>• Maximum file size: 2MB</li>
                    <li>• Your logo will appear on invoices and documents</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Brand Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="w-12 h-10 border border-gray-600 rounded cursor-pointer"
                      defaultValue="#f08c17"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      defaultValue="#f08c17"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="w-12 h-10 border border-gray-600 rounded cursor-pointer"
                      defaultValue="#000000"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      defaultValue="#000000"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Business Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Currency
                  </label>
                  <select 
                    value="USD"
                    disabled
                    className="w-full md:w-1/2 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    <option>USD - US Dollar</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Currency is set permanently to USD for this platform</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Time Zone
                  </label>
                  <select className="w-full md:w-1/2 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
                    <option>UTC-8 (Pacific Time)</option>
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC+0 (GMT)</option>
                    <option>UTC+1 (Central European Time)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select className="w-full md:w-1/2 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Order Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Auto-accept Orders</h4>
                    <p className="text-gray-400 text-sm">Automatically accept new orders without manual review</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Low Stock Alerts</h4>
                    <p className="text-gray-400 text-sm">Get notified when products reach minimum stock levels</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: "New Orders", desc: "Get notified when you receive new orders" },
                  { label: "Order Status Updates", desc: "Receive updates when order status changes" },
                  { label: "Payment Confirmations", desc: "Get notified about successful payments" },
                  { label: "Low Stock Warnings", desc: "Alert when inventory levels are low" },
                  { label: "Monthly Reports", desc: "Receive monthly business performance summaries" },
                  { label: "Account Security", desc: "Important security notifications and alerts" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{item.label}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={index < 4} />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Security Settings</h3>
              <div className="space-y-4">
                {/* Two-Factor Authentication */}
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="two-factor"
                        checked={securitySettings.twoFactorEnabled}
                        onChange={(e) => toggle2FA(e.target.checked)}
                        disabled={saving}
                        className="sr-only"
                      />
                      <label
                        htmlFor="two-factor"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#f08c17] focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          securitySettings.twoFactorEnabled ? "bg-[#f08c17]" : "bg-gray-600"
                        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            securitySettings.twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Session Timeout */}
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Session Timeout</h4>
                    <p className="text-gray-400 text-sm mt-1 mb-3">
                      Automatically log out after inactive period (minutes)
                    </p>
                    <input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      className="w-24 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      min="5"
                      max="1440"
                    />
                    <span className="text-gray-400 text-sm ml-2">minutes</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
                  Save Security Settings
                </button>
              </div>
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Current Plan</h3>
              <div className="p-6 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold text-[#f08c17]">Merchant Plan</h4>
                    <p className="text-gray-400">Up to 1,000 orders per month</p>
                    <p className="text-2xl font-bold text-white mt-2">$49<span className="text-lg text-gray-400">/month</span></p>
                    <p className="text-gray-400 text-sm mt-1">Next billing: December 6, 2025</p>
                  </div>
                  <button className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Payment Method</h3>
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="text-white">•••• •••• •••• 4242</p>
                      <p className="text-gray-400 text-sm">Expires 12/24</p>
                    </div>
                  </div>
                  <button className="text-[#f08c17] hover:text-orange-500 transition-colors">
                    Update
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Usage This Month</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#f08c17]">247</div>
                  <div className="text-sm text-gray-400">Orders Processed</div>
                  <div className="text-xs text-gray-500 mt-1">753 remaining</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">15.2GB</div>
                  <div className="text-sm text-gray-400">Storage Used</div>
                  <div className="text-xs text-gray-500 mt-1">4.8GB remaining</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">98.5%</div>
                  <div className="text-sm text-gray-400">Uptime</div>
                  <div className="text-xs text-gray-500 mt-1">Excellent performance</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Merchant Settings</h1>
        <p className="text-gray-400">Manage your business profile and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#f08c17] text-black"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="mr-3 text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-black border border-gray-700 rounded-lg p-6">
            {renderTabContent()}
            
            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex justify-end space-x-3">
                <button className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700 text-green-300 rounded-lg">
            {message}
          </div>
        )}

        {/* 2FA Setup Modal */}
        <TwoFactorSetupModal
          isOpen={show2FAModal}
          onClose={() => setShow2FAModal(false)}
          onSuccess={handle2FASuccess}
        />
      </div>
    </div>
  );
}