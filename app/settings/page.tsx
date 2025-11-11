"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import DisableTwoFactorModal from "@/components/DisableTwoFactorModal";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  address: string;
  website?: string;
  description?: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  orderNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  allowedIpAddresses: string[];
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // State for different settings
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
  });

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    address: "",
    website: "",
    description: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    orderNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    weeklyReports: false,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    allowedIpAddresses: [],
  });

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);

  const tabs = [
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "business", name: "Business", icon: "🏢" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "billing", name: "Billing", icon: "💳" },
    { id: "api-keys", name: "API Keys", icon: "🔑" },
  ];

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load user profile data
      const profileRes = await api.get("/api/users/me");
      if (profileRes.ok && profileRes.data?.user) {
        const userData = profileRes.data.user;
        setProfile({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          avatar: userData.avatarUrl || "",
        });
        
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: userData.twoFactorEnabled || false,
        }));
      }

      // Try to load merchant data for business settings
      try {
        const merchantsRes = await api.get("/api/merchants");
        if (merchantsRes.ok && merchantsRes.data?.merchants?.length > 0) {
          const merchant = merchantsRes.data.merchants[0]; // Use first merchant
          setBusinessSettings({
            businessName: merchant.businessName || "",
            businessEmail: merchant.businessEmail || "",
            businessPhone: merchant.businessPhone || "",
            address: merchant.address || "",
            website: merchant.website || "",
            description: merchant.description || "",
          });
          // load api keys for this merchant
          try {
            const keysRes = await api.get(`/api/merchants/${merchant.id}/api-keys`);
            if (keysRes.ok && keysRes.data?.apiKeys) {
              setApiKeys(keysRes.data.apiKeys);
            }
          } catch (e) {
            console.log("Could not load api keys", e);
          }
        }
      } catch (error) {
        console.log("No merchant data available");
      }

      // Load notification preferences from API
      try {
        const prefsRes = await api.get("/api/notification-preferences");
        if (prefsRes.ok && prefsRes.data?.preferences) {
          const prefs = prefsRes.data.preferences;
          
          // Convert API format to our state format
          const notificationPrefs = {
            emailNotifications: prefs.find((p: any) => p.notificationType === 'email_notifications' && p.channel === 'EMAIL')?.enabled ?? true,
            orderNotifications: prefs.find((p: any) => p.notificationType === 'order_notifications' && p.channel === 'EMAIL')?.enabled ?? true,
            marketingEmails: prefs.find((p: any) => p.notificationType === 'marketing_emails' && p.channel === 'EMAIL')?.enabled ?? false,
            securityAlerts: prefs.find((p: any) => p.notificationType === 'security_alerts' && p.channel === 'EMAIL')?.enabled ?? true,
            weeklyReports: prefs.find((p: any) => p.notificationType === 'weekly_reports' && p.channel === 'EMAIL')?.enabled ?? false,
          };
          
          setNotificationPrefs(notificationPrefs);
        } else {
          // Set defaults if no preferences found
          setNotificationPrefs({
            emailNotifications: true,
            orderNotifications: true,
            marketingEmails: false,
            securityAlerts: true,
            weeklyReports: false,
          });
        }
      } catch (error) {
        console.log("No notification preferences available, using defaults");
        setNotificationPrefs({
          emailNotifications: true,
          orderNotifications: true,
          marketingEmails: false,
          securityAlerts: true,
          weeklyReports: false,
        });
      }

      // Load system settings for session timeout and other system-level preferences
      try {
        const systemRes = await api.get("/api/settings");
        if (systemRes.ok && systemRes.data?.settings) {
          const systemSettings = systemRes.data.settings;
          setSecuritySettings(prev => ({
            ...prev,
            sessionTimeout: systemSettings.sessionTimeout || 30,
          }));
        }
      } catch (error) {
        console.log("Could not load system settings, using defaults");
      }

    } catch (error) {
      console.error("Failed to load settings:", error);
      setMessage("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put("/api/users/me", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      if (response.ok) {
        setMessage("Profile updated successfully");
      } else {
        throw new Error(response.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessSettings = async () => {
    setSaving(true);
    try {
      // First, get the current user's merchants
      const merchantsRes = await api.get("/api/merchants");
      if (!merchantsRes.ok || !merchantsRes.data?.merchants?.length) {
        setMessage("No business found. Please contact support to set up your business.");
        return;
      }

      const merchantId = merchantsRes.data.merchants[0].id;
      const response = await api.put(`/api/merchants/${merchantId}`, {
        businessName: businessSettings.businessName,
        businessEmail: businessSettings.businessEmail,
        businessPhone: businessSettings.businessPhone,
        address: businessSettings.address,
        website: businessSettings.website,
        description: businessSettings.description,
      });
      
      if (response.ok) {
        setMessage("Business settings updated successfully");
      } else {
        throw new Error(response.error || "Failed to update business settings");
      }
    } catch (error) {
      console.error("Failed to save business settings:", error);
      setMessage("Failed to update business settings");
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationPreferences = async () => {
    setSaving(true);
    try {
      // Convert our state format to API format
      const preferences = [
        {
          notificationType: 'email_notifications',
          channel: 'EMAIL',
          enabled: notificationPrefs.emailNotifications,
        },
        {
          notificationType: 'order_notifications', 
          channel: 'EMAIL',
          enabled: notificationPrefs.orderNotifications,
        },
        {
          notificationType: 'marketing_emails',
          channel: 'EMAIL', 
          enabled: notificationPrefs.marketingEmails,
        },
        {
          notificationType: 'security_alerts',
          channel: 'EMAIL',
          enabled: notificationPrefs.securityAlerts,
        },
        {
          notificationType: 'weekly_reports',
          channel: 'EMAIL',
          enabled: notificationPrefs.weeklyReports,
        },
      ];

      const response = await api.put("/api/notification-preferences", { preferences });
      if (response.ok) {
        setMessage("Notification preferences updated successfully");
      } else {
        throw new Error(response.error || "Failed to update notification preferences");
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      setMessage("Failed to update notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const createApiKey = async () => {
    setCreatingKey(true);
    try {
      const merchantsRes = await api.get("/api/merchants");
      if (!merchantsRes.ok || !merchantsRes.data?.merchants?.length) {
        setMessage("No business found. Please contact support to set up your business.");
        return;
      }

      const merchantId = merchantsRes.data.merchants[0].id;
      const res = await api.post(`/api/merchants/${merchantId}/api-keys`, { keyName: newKeyName || "default" });
      if (res.ok && res.data) {
        // show the created key material to the user
        const created = { id: res.data.id, keyName: newKeyName || "default", prefix: res.data.apiKey?.slice(0,8), createdAt: new Date().toISOString() };
        setApiKeys(prev => [created, ...prev]);
        setMessage("API key created — save the apiKey & secret now. This will not be shown again.");
      } else {
        throw new Error(res.error || "Failed to create key");
      }
    } catch (error: any) {
      console.error("Create API key error:", error);
      setMessage(error?.message || "Failed to create API key");
    } finally {
      setCreatingKey(false);
      setNewKeyName("");
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const merchantsRes = await api.get("/api/merchants");
      if (!merchantsRes.ok || !merchantsRes.data?.merchants?.length) {
        setMessage("No business found.");
        return;
      }

      const merchantId = merchantsRes.data.merchants[0].id;
      const res = await api.patch(`/api/merchants/${merchantId}/api-keys/${keyId}`, { action: 'revoke' });
      if (res.ok) {
        setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'REVOKED' } : k));
        setMessage("API key revoked");
      } else {
        throw new Error(res.error || "Failed to revoke key");
      }
    } catch (error: any) {
      console.error("Revoke API key error:", error);
      setMessage(error?.message || "Failed to revoke API key");
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put("/api/users/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      if (response.ok) {
        setMessage("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(response.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      setMessage("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    if (enabled) {
      // Show setup modal for enabling 2FA
      setShow2FAModal(true);
    } else {
      // Ask for password before disabling 2FA
      setShowDisable2FAModal(true);
    }
  };

  const handle2FASuccess = () => {
    setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: true }));
    setMessage("Two-factor authentication enabled successfully");
  };

  const handleDisable2FASuccess = () => {
    setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: false }));
    setMessage("Two-factor authentication disabled successfully");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={changePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        );

      case "business":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessSettings.businessName}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={businessSettings.businessEmail}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, businessEmail: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    value={businessSettings.businessPhone}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, businessPhone: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={businessSettings.website || ""}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Address
                  </label>
                  <textarea
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Description
                  </label>
                  <textarea
                    value={businessSettings.description || ""}
                    onChange={(e) => setBusinessSettings(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    rows={4}
                    placeholder="Describe your business..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={saveBusinessSettings}
                  disabled={saving}
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Business Settings"}
                </button>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: "emailNotifications", label: "Email Notifications", description: "Receive general email notifications" },
                  { key: "orderNotifications", label: "Order Notifications", description: "Get notified about order updates" },
                  { key: "marketingEmails", label: "Marketing Emails", description: "Receive promotional and marketing emails" },
                  { key: "securityAlerts", label: "Security Alerts", description: "Important security notifications" },
                  { key: "weeklyReports", label: "Weekly Reports", description: "Receive weekly business reports" },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-start justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{pref.label}</h4>
                      <p className="text-gray-400 text-sm">{pref.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs[pref.key as keyof NotificationPreferences]}
                        onChange={(e) => setNotificationPrefs(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  onClick={saveNotificationPreferences}
                  disabled={saving}
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
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
                <div className="flex items-start justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                    <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorEnabled}
                      onChange={(e) => toggle2FA(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f08c17]"></div>
                  </label>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Session Timeout</h4>
                  <p className="text-gray-400 text-sm mb-3">Automatically log out after period of inactivity</p>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Billing & Subscription</h3>
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-medium">Current Plan</h4>
                    <p className="text-gray-400 text-sm">Professional Plan</p>
                  </div>
                  <span className="bg-[#f08c17] text-black px-3 py-1 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Monthly Fee</p>
                    <p className="text-white font-medium">₦29,999</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Next Billing</p>
                    <p className="text-white font-medium">Dec 6, 2025</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors">
                    Upgrade Plan
                  </button>
                  <button className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    Billing History
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "api-keys":
        // Only show API key management to merchants and admins. Merchant staff will only view.
        if (!user) return null;
        const canCreateKey = user.role === "ADMIN" || user.role === "MERCHANT";
        const showKeys = user.role !== "LOGISTICS_PERSONNEL";

        if (!showKeys) return (
          <div className="p-6 text-gray-400">API keys are not available for your role.</div>
        );

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">API Keys</h3>
              <p className="text-gray-400 mb-4">Create and manage API keys for integrations. Only admins and merchant owners can create keys; merchant staff can view and copy.</p>

              <div className="mb-4">
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" className="px-3 py-2 bg-black border border-gray-600 rounded-lg text-white mr-2" />
                <button disabled={!canCreateKey || creatingKey} onClick={createApiKey} className={`bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium ${(!canCreateKey || creatingKey) ? 'opacity-50' : ''}`}>
                  {creatingKey ? 'Creating...' : 'Create API Key'}
                </button>
              </div>

              <div className="space-y-2">
                {apiKeys.length === 0 && (
                  <div className="text-gray-400">No API keys yet.</div>
                )}

                {apiKeys.map((k) => (
                  <div key={k.id} className="p-3 bg-gray-800 rounded flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{k.keyName || 'key'}</div>
                      <div className="text-gray-400 text-sm">Prefix: {k.prefix} • Created: {new Date(k.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="border border-gray-600 text-gray-300 px-3 py-1 rounded" onClick={() => { navigator.clipboard?.writeText(k.prefix || ''); setMessage('Prefix copied') }}>Copy Prefix</button>
                      {k.status !== 'REVOKED' && canCreateKey && (
                        <button onClick={() => revokeApiKey(k.id)} className="bg-red-600 text-white px-3 py-1 rounded">Revoke</button>
                      )}
                      {k.status === 'REVOKED' && (
                        <span className="text-sm text-gray-400">Revoked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-blue-900/20 border border-blue-700 text-blue-300 px-4 py-3 rounded">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? "border-[#f08c17] text-[#f08c17]"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-black border border-gray-700 rounded-lg p-6">
        {renderTabContent()}
      </div>

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSuccess={handle2FASuccess}
      />
      {/* 2FA Disable Modal */}
      <DisableTwoFactorModal
        isOpen={showDisable2FAModal}
        onClose={() => setShowDisable2FAModal(false)}
        onSuccess={() => {
          // update UI after successful disable
          handleDisable2FASuccess();
          setShowDisable2FAModal(false);
        }}
      />
    </div>
  );
}