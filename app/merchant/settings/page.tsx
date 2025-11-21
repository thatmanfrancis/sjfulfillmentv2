'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export default function MerchantSettingsPage() {
  // TODO: Add your state and logic here (settings, updateSetting, handleSave, saving, etc.)
  // This is a placeholder for demonstration. Replace with your actual logic.
  const [settings, setSettings] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    taxId: '',
    emailNotifications: false,
    orderNotifications: false,
    lowStockAlerts: false,
    autoReorder: false,
    reorderThreshold: 0,
  });
  const [saving, setSaving] = useState(false);
  const updateSetting = (key: string, value: any) => setSettings((s) => ({ ...s, [key]: value }));
  const handleSave = () => {};

  return (
    <div className="p-6">
      <Tabs defaultValue="business">
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => updateSetting('businessName', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => updateSetting('businessEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={settings.businessPhone}
                      onChange={(e) => updateSetting('businessPhone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => updateSetting('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={settings.city}
                      onChange={(e) => updateSetting('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={settings.state}
                      onChange={(e) => updateSetting('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={settings.zipCode}
                      onChange={(e) => updateSetting('zipCode', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={settings.taxId}
                    onChange={(e) => updateSetting('taxId', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="emailNotif"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
                <Label htmlFor="emailNotif">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="orderNotif"
                  checked={settings.orderNotifications}
                  onCheckedChange={(checked) => updateSetting('orderNotifications', checked)}
                />
                <Label htmlFor="orderNotif">Order Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="stockAlerts"
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) => updateSetting('lowStockAlerts', checked)}
                />
                <Label htmlFor="stockAlerts">Low Stock Alerts</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Configure inventory settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoReorder"
                  checked={settings.autoReorder}
                  onCheckedChange={(checked) => updateSetting('autoReorder', checked)}
                />
                <Label htmlFor="autoReorder">Auto Reorder</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
                <Input
                  id="reorderThreshold"
                  type="number"
                  value={settings.reorderThreshold}
                  onChange={(e) => updateSetting('reorderThreshold', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage billing and payment settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Billing settings will be available here. Contact support for billing inquiries.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}