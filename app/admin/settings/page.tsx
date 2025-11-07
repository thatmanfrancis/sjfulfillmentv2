"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("system");
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    userRegistration: true,
    emailVerification: true,
    twoFactorRequired: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    orderApprovalRequired: false,
    autoInventoryUpdates: true,
    lowStockThreshold: 10,
    emailNotifications: true,
    smsNotifications: false,
    webhookNotifications: true,
    platformName: "SJF Logistics Platform",
    supportEmail: "support@sjflogistics.com",
    defaultCurrency: "USD",
    defaultTimezone: "UTC",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/settings");
      if (response.ok && response.data?.settings) {
        setSettings(prev => ({
          ...prev,
          ...response.data.settings,
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.put("/api/settings", {
        settings: settings,
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      } else {
        throw new Error(response.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: "system", name: "System", icon: "⚙️" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "users", name: "User Management", icon: "👥" },
    { id: "orders", name: "Order Settings", icon: "📦" },
    { id: "inventory", name: "Inventory", icon: "📊" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "integrations", name: "Integrations", icon: "🔗" },
    { id: "logs", name: "System Logs", icon: "📋" },
  ];

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Platform Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Maintenance Mode</h4>
              <p className="text-gray-400 text-sm">Temporarily disable access to the platform</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.maintenanceMode}
                onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.platformName}
                onChange={(e) => handleSettingChange('platformName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Support Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.supportEmail}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Currency
              </label>
              <select 
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.defaultCurrency}
                onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Timezone
              </label>
              <select 
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.defaultTimezone}
                onChange={(e) => handleSettingChange('defaultTimezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-white font-medium mb-2">Database Status</h4>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm">Connected</span>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-white font-medium mb-2">Cache Status</h4>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm">Active</span>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-white font-medium mb-2">API Status</h4>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Authentication Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Require Email Verification</h4>
              <p className="text-gray-400 text-sm">Users must verify their email before accessing the platform</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.emailVerification}
                onChange={(e) => handleSettingChange('emailVerification', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Require Two-Factor Authentication</h4>
              <p className="text-gray-400 text-sm">Force all users to enable 2FA for enhanced security</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.twoFactorRequired}
                onChange={(e) => handleSettingChange('twoFactorRequired', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Timeout (hours)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">API Security</h3>
        <div className="space-y-4">
          <button className="w-full md:w-auto bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
            Regenerate API Keys
          </button>
          <button className="w-full md:w-auto bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors ml-0 md:ml-3 mt-3 md:mt-0">
            View Rate Limits
          </button>
        </div>
      </div>
    </div>
  );

  const renderUserSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Registration Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Allow User Registration</h4>
              <p className="text-gray-400 text-sm">Allow new users to register for accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.userRegistration}
                onChange={(e) => handleSettingChange('userRegistration', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Role for New Users
            </label>
            <select className="w-full md:w-64 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
              <option value="MERCHANT">Merchant</option>
              <option value="MERCHANT_STAFF">Merchant Staff</option>
              <option value="LOGISTICS_PERSONNEL">Logistics Personnel</option>
              <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">User Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Total Users</h4>
            <p className="text-2xl font-bold text-white">1,247</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Active Today</h4>
            <p className="text-2xl font-bold text-green-400">234</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">New This Week</h4>
            <p className="text-2xl font-bold text-[#f08c17]">47</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Pending Verification</h4>
            <p className="text-2xl font-bold text-yellow-400">12</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Order Processing</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Require Order Approval</h4>
              <p className="text-gray-400 text-sm">All orders must be approved before processing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.orderApprovalRequired}
                onChange={(e) => handleSettingChange('orderApprovalRequired', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Auto-Cancel After (days)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                defaultValue="7"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Shipping Method
              </label>
              <select className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
                <option>Standard Shipping</option>
                <option>Express Shipping</option>
                <option>Next Day Delivery</option>
                <option>Same Day Delivery</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">Order Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Total Orders</h4>
            <p className="text-2xl font-bold text-white">5,847</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Pending</h4>
            <p className="text-2xl font-bold text-yellow-400">127</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">In Progress</h4>
            <p className="text-2xl font-bold text-blue-400">89</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Completed Today</h4>
            <p className="text-2xl font-bold text-green-400">34</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventorySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Inventory Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Auto-Update Inventory</h4>
              <p className="text-gray-400 text-sm">Automatically update inventory levels when orders are processed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.autoInventoryUpdates}
                onChange={(e) => handleSettingChange('autoInventoryUpdates', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              className="w-full md:w-32 px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              value={settings.lowStockThreshold}
              onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">Inventory Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Total Products</h4>
            <p className="text-2xl font-bold text-white">2,847</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Low Stock</h4>
            <p className="text-2xl font-bold text-red-400">47</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Out of Stock</h4>
            <p className="text-2xl font-bold text-red-500">12</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-gray-400 text-sm">Categories</h4>
            <p className="text-2xl font-bold text-[#f08c17]">156</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Email Notifications</h4>
              <p className="text-gray-400 text-sm">Send system notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.emailNotifications}
                onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">SMS Notifications</h4>
              <p className="text-gray-400 text-sm">Send critical alerts via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.smsNotifications}
                onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Webhook Notifications</h4>
              <p className="text-gray-400 text-sm">Send real-time updates to external systems</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.webhookNotifications}
                onChange={(e) => handleSettingChange('webhookNotifications', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">SMTP Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              value={settings.smtpHost}
              onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              SMTP Port
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              value={settings.smtpPort}
              onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              value={settings.smtpUsername}
              onChange={(e) => handleSettingChange('smtpUsername', e.target.value)}
              placeholder="smtp-username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              value={settings.smtpPassword}
              onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
        <button className="mt-4 bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
          Test SMTP Connection
        </button>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Third-Party Integrations</h3>
        <div className="space-y-4">
          {[
            { name: "Stripe", type: "Payment Gateway", status: "Connected", color: "green" },
            { name: "PayPal", type: "Payment Gateway", status: "Not Connected", color: "gray" },
            { name: "FedEx", type: "Shipping Provider", status: "Connected", color: "green" },
            { name: "UPS", type: "Shipping Provider", status: "Connected", color: "green" },
            { name: "DHL", type: "Shipping Provider", status: "Not Connected", color: "gray" },
            { name: "Twilio", type: "SMS Provider", status: "Connected", color: "green" },
            { name: "SendGrid", type: "Email Provider", status: "Connected", color: "green" },
            { name: "Slack", type: "Team Communication", status: "Not Connected", color: "gray" },
          ].map((integration, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <h4 className="text-white font-medium">{integration.name}</h4>
                <p className="text-gray-400 text-sm">{integration.type}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${integration.color === 'green' ? 'text-green-400' : 'text-gray-400'}`}>
                  {integration.status}
                </span>
                <button
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    integration.status === 'Connected'
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-[#f08c17] text-black hover:bg-orange-500"
                  }`}
                >
                  {integration.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-white mb-4">API Management</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-medium">Production API Key</h4>
                <p className="text-gray-400 text-sm">Used for live transactions</p>
              </div>
              <button className="text-[#f08c17] hover:text-orange-500 transition-colors text-sm">
                Regenerate
              </button>
            </div>
            <div className="bg-black border border-gray-600 rounded p-3">
              <code className="text-gray-300 text-sm">pk_live_••••••••••••••••••••••••••••••••</code>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-medium">Test API Key</h4>
                <p className="text-gray-400 text-sm">Used for development and testing</p>
              </div>
              <button className="text-[#f08c17] hover:text-orange-500 transition-colors text-sm">
                Regenerate
              </button>
            </div>
            <div className="bg-black border border-gray-600 rounded p-3">
              <code className="text-gray-300 text-sm">pk_test_••••••••••••••••••••••••••••••••</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemLogs = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">System Activity Logs</h3>
        <div className="flex space-x-3">
          <select className="px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]">
            <option>All Events</option>
            <option>System Events</option>
            <option>User Events</option>
            <option>Security Events</option>
            <option>Error Events</option>
          </select>
          <button className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
            Export Logs
          </button>
        </div>
      </div>

      <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {[
                {
                  timestamp: "2024-01-15 10:30:15",
                  type: "User Login",
                  user: "admin@sjf.com",
                  description: "Successful admin login",
                  ip: "192.168.1.100",
                  level: "info"
                },
                {
                  timestamp: "2024-01-15 10:25:42",
                  type: "System",
                  user: "System",
                  description: "Database backup completed",
                  ip: "127.0.0.1",
                  level: "success"
                },
                {
                  timestamp: "2024-01-15 10:20:18",
                  type: "Security",
                  user: "user@example.com",
                  description: "Failed login attempt",
                  ip: "203.0.113.45",
                  level: "warning"
                },
                {
                  timestamp: "2024-01-15 10:15:33",
                  type: "Order",
                  user: "merchant@store.com",
                  description: "Order #12345 created",
                  ip: "192.168.1.105",
                  level: "info"
                },
                {
                  timestamp: "2024-01-15 10:10:27",
                  type: "Error",
                  user: "System",
                  description: "Payment gateway timeout",
                  ip: "127.0.0.1",
                  level: "error"
                },
              ].map((log, index) => (
                <tr key={index} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.level === 'success' ? 'bg-green-900 text-green-300' :
                      log.level === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                      log.level === 'error' ? 'bg-red-900 text-red-300' :
                      'bg-blue-900 text-blue-300'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {log.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "system":
        return renderSystemSettings();
      case "security":
        return renderSecuritySettings();
      case "users":
        return renderUserSettings();
      case "orders":
        return renderOrderSettings();
      case "inventory":
        return renderInventorySettings();
      case "notifications":
        return renderNotificationSettings();
      case "integrations":
        return renderIntegrationSettings();
      case "logs":
        return renderSystemLogs();
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
        <div className="flex items-center justify-between">
          <p className="text-gray-400">Configure system-wide settings and preferences</p>
          {lastSaved && (
            <p className="text-sm text-green-400">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#f08c17]"></div>
        </div>
      ) : (
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
              {activeTab !== 'logs' && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <div className="flex justify-end space-x-3">
                    <button 
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                      onClick={fetchSettings}
                      disabled={loading || saving}
                    >
                      Reset to Defaults
                    </button>
                    <button 
                      className="bg-[#f08c17] text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                      onClick={saveSettings}
                      disabled={loading || saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}