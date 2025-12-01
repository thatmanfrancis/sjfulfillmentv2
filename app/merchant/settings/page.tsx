"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
// import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Shield,
  Bell,
  Save,
  Lock,
  Smartphone,
  Mail,
  Building,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { get, put } from "@/lib/api";
import { ApiKeyManager } from "@/components/admin/ApiKeyManager";
export default function MerchantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // MFA state for merchant
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const handleMfaToggle = async (enabled: boolean) => {
    setMfaError("");
    if (enabled) {
      // Setup MFA - get QR code
      const response = await put("/api/user/mfa", { enabled: true });
      const mfaResponse = response as { qrCodeUrl?: string; secret?: string };
      if (mfaResponse.qrCodeUrl) setMfaQrCode(mfaResponse.qrCodeUrl);
      if (mfaResponse.secret) setMfaSecret(mfaResponse.secret);
      setMfaModal(true);
    } else {
      // Disable MFA
      await put("/api/user/mfa", { enabled: false });
      setMfaEnabled(false);
    }
  };

  // Handle MFA verify
  const handleMfaVerify = async () => {
    setMfaError("");
    const response = await put("/api/user/mfa", {
      enabled: true,
      token: mfaToken,
    });
    const verifyResponse = response as { success?: boolean; error?: string };
    if (verifyResponse.success) {
      setMfaEnabled(true);
      setMfaModal(false);
      setMfaToken("");
      setMfaSecret("");
      setMfaQrCode("");
    } else {
      setMfaError(verifyResponse.error || "Invalid verification code");
    }
  };
  // Password change handler
  const handleChangePassword = async () => {
    setPasswordError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMsg = data.error || "Failed to change password";
        if (data.details && Array.isArray(data.details)) {
          errorMsg += "\n" + data.details.map((d: any) => d.message).join("\n");
        }
        setPasswordError(errorMsg);
      } else {
        setPasswordError("");
        setPasswordModal(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        alert("Password changed successfully");
      }
    } catch {
      setPasswordError("Server error. Please try again.");
    }
  };
  // Security tab state
  const [showCurrentPassword] = useState(false);
  const [showNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  // State for all tabs
  const [passwordModal, setPasswordModal] = useState(false);
  const [settings, setSettings] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    taxId: "",
    emailNotifications: false,
    orderNotifications: false,
    lowStockAlerts: false,
    autoReorder: false,
    reorderThreshold: 0,
  });
  const [saving, setSaving] = useState(false);
  const updateSetting = (key: string, value: any) =>
    setSettings((s) => ({ ...s, [key]: value }));

  // Removed unused loading and error state
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      setError(null);
      try {
        const data = await get<any>("/api/merchant/settings");
        // console.log("Merchant settings response:", data);
        // Prefer settings, then merchant, then business for each field
        const merchant = data.merchant || {};
        const business = data.business || {};
        const settingsMap: any = {};
        settingsMap.businessName =
          merchant.firstName && merchant.lastName
            ? `${merchant.firstName} ${merchant.lastName}`
            : business.name || "";
        settingsMap.businessEmail = merchant.email || business.ownerId || "";
        settingsMap.businessPhone =
          business.contactPhone || merchant.phone || "";
        settingsMap.address = business.address || "";
        settingsMap.city = business.city || "";
        settingsMap.state = business.state || "";
        settingsMap.zipCode = "";
        settingsMap.taxId = "";
        settingsMap.bio = merchant.bio || "";
        settingsMap.department = merchant.department || "";
        settingsMap.position = merchant.position || "";
        settingsMap.location = merchant.location || business.city || "";
        settingsMap.timezone = merchant.timezone || "UTC";
        settingsMap.language = merchant.language || "en";
        settingsMap.avatarUrl = business.logoUrl || merchant.profileImage || "";
        settingsMap.emailNotifications = merchant.emailNotifications ?? false;
        settingsMap.orderNotifications = merchant.smsNotifications ?? false;
        settingsMap.lowStockAlerts = false;
        settingsMap.autoReorder = false;
        settingsMap.reorderThreshold = 0;
        setSettings(settingsMap);
      } catch (err: any) {
        setError(err?.message || "Failed to load merchant settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Save settings to API
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(async ([key, value]) => {
          await put(`/api/merchant/settings/${encodeURIComponent(key)}`, {
            value: String(value),
          });
        })
      );
    } catch {
      // ignore error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {loading && (
        <div className="text-center py-8 text-yellow-400">
          Loading merchant settings...
        </div>
      )}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-[#2a2a2a] border-gray-700">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black"
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black"
          >
            <Bell className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="business"
            className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black"
          >
            <Building className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-[#f8c017]/30">
                  <AvatarImage
                    src={(settings as any).avatarUrl || ""}
                    alt="Profile"
                  />
                  <AvatarFallback className="bg-[#f8c017]/20 text-[#f8c017] text-xl font-bold">
                    {settings.businessName ? settings.businessName[0] : ""}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    {settings.businessName}
                  </h3>
                  <p className="text-gray-400">{settings.businessEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Section */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#f8c017]/20 rounded-lg">
                    <Lock className="h-5 w-5 text-[#f8c017]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Password</h3>
                    <p className="text-sm text-gray-400">
                      Change your account password
                    </p>
                  </div>
                </div>
                <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-600 hover:border-[#f8c017]/50"
                    >
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#2a2a2a] border-gray-700">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                      />
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                      />
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                      {passwordError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {passwordError}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setPasswordModal(false)}
                        className="border-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
                        onClick={handleChangePassword}
                        disabled={
                          !passwordForm.currentPassword ||
                          !passwordForm.newPassword ||
                          !passwordForm.confirmPassword
                        }
                      >
                        Update Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* MFA Section */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700 mt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#f8c017]/20 rounded-lg">
                    <Shield className="h-5 w-5 text-[#f8c017]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-sm text-gray-400">
                      Protect your account with an extra layer of security.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={handleMfaToggle}
                />
              </div>

              {/* MFA Setup Modal */}
              <Dialog open={mfaModal} onOpenChange={setMfaModal}>
                <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Setup Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Scan the QR code with your authenticator app and enter the
                      code below.
                    </DialogDescription>
                  </DialogHeader>
                  {mfaQrCode && (
                    <div className="flex flex-col items-center gap-2 my-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          mfaQrCode
                        )}`}
                        alt="MFA QR Code"
                        className="rounded"
                      />
                      <div className="text-xs text-gray-400 break-all">
                        Secret: {mfaSecret}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="mfaToken">Verification Code</Label>
                    <Input
                      id="mfaToken"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  {mfaError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {mfaError}
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setMfaModal(false)}
                      className="border-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
                      onClick={handleMfaVerify}
                      disabled={!mfaToken}
                    >
                      Verify & Activate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* API Key Management Section (Merchant) */}
              <div className="mt-8">
                {/* Use merchant mode for merchant API key management */}
                <ApiKeyManager mode="merchant" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#f8c017]" />
                  <div>
                    <h3 className="font-medium text-white">
                      Email Notifications
                    </h3>
                    <p className="text-sm text-gray-400">
                      Receive updates and alerts via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("emailNotifications", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-[#f8c017]" />
                  <div>
                    <h3 className="font-medium text-white">
                      Order Notifications
                    </h3>
                    <p className="text-sm text-gray-400">
                      Receive order alerts via SMS
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.orderNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("orderNotifications", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[#f8c017]" />
                  <div>
                    <h3 className="font-medium text-white">Low Stock Alerts</h3>
                    <p className="text-sm text-gray-400">
                      Get notified when stock is low
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) =>
                    updateSetting("lowStockAlerts", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab (full parity with admin) */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-[#f8c017]/30">
                  <AvatarImage
                    src={(settings as any).avatarUrl || ""}
                    alt="Profile"
                  />
                  <AvatarFallback className="bg-[#f8c017]/20 text-[#f8c017] text-xl font-bold">
                    {settings.businessName ? settings.businessName[0] : "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    {settings.businessName || "Merchant"}
                  </h3>
                  <p className="text-gray-400">
                    {settings.businessEmail || "merchant@email.com"}
                  </p>
                </div>
                <div className="ml-auto space-y-2">
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    // onChange={handleAvatarChange}
                    className="max-w-xs bg-[#1a1a1a] border-gray-600 text-white file:text-white file:bg-[#2a2a2a] file:border-gray-600"
                  />
                  <Button className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black">
                    Upload
                  </Button>
                  <p className="text-xs text-gray-400">Max 5MB, JPG/PNG/WEBP</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-gray-300">
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) =>
                      updateSetting("businessName", e.target.value)
                    }
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail" className="text-gray-300">
                    Business Email
                  </Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) =>
                      updateSetting("businessEmail", e.target.value)
                    }
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone" className="text-gray-300">
                    Business Phone
                  </Label>
                  <Input
                    id="businessPhone"
                    value={settings.businessPhone}
                    onChange={(e) =>
                      updateSetting("businessPhone", e.target.value)
                    }
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-300">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={(settings as any).location || ""}
                    onChange={(e) => updateSetting("location", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-300">
                  Bio
                </Label>
                <Input
                  id="bio"
                  value={(settings as any).bio || ""}
                  onChange={(e) => updateSetting("bio", e.target.value)}
                  className="bg-[#1a1a1a] border-gray-600 text-white"
                  placeholder="Tell us about your business..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-gray-300">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={(settings as any).department || ""}
                    onChange={(e) =>
                      updateSetting("department", e.target.value)
                    }
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-300">
                    Position
                  </Label>
                  <Input
                    id="position"
                    value={(settings as any).position || ""}
                    onChange={(e) => updateSetting("position", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Language</Label>
                  <Input
                    id="language"
                    value={(settings as any).language || "en"}
                    onChange={(e) => updateSetting("language", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Timezone</Label>
                  <Input
                    id="timezone"
                    value={(settings as any).timezone || "UTC"}
                    onChange={(e) => updateSetting("timezone", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={(settings.address as any) || ""}
                    onChange={(e) => updateSetting("address", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={(settings.city as any) || ""}
                    onChange={(e) => updateSetting("city", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={(settings.state as any) || ""}
                    onChange={(e) => updateSetting("state", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={(settings.zipCode as any) || ""}
                    onChange={(e) => updateSetting("zipCode", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={(settings.taxId as any) || ""}
                    onChange={(e) => updateSetting("taxId", e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Configure inventory settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoReorder"
                  checked={(settings.autoReorder as any) || false}
                  onCheckedChange={(checked) =>
                    updateSetting("autoReorder", checked)
                  }
                />
                <Label htmlFor="autoReorder">Auto Reorder</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
                <Input
                  id="reorderThreshold"
                  type="number"
                  value={settings.reorderThreshold}
                  onChange={(e) =>
                    updateSetting("reorderThreshold", parseInt(e.target.value))
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage billing and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Billing settings will be available here. Contact support for
                billing inquiries.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
