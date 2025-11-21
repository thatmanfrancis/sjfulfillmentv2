'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Save, Truck, Bell, MapPin, Clock } from 'lucide-react';

interface LogisticsSettings {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  operatingHours: string;
  defaultCarrier: string;
  autoDispatch: boolean;
  routeOptimization: boolean;
  realTimeTracking: boolean;
  deliveryNotifications: boolean;
  smsAlerts: boolean;
  maxDeliveryRadius: number;
  standardDeliveryTime: number;
}

export default function LogisticsSettingsPage() {
  const [settings, setSettings] = useState<LogisticsSettings>({
    companyName: 'SJFulfillment Logistics',
    contactEmail: 'logistics@sjfulfillment.com',
    contactPhone: '+1 (555) 987-6543',
    operatingHours: '8:00 AM - 6:00 PM',
    defaultCarrier: 'FedEx',
    autoDispatch: true,
    routeOptimization: true,
    realTimeTracking: true,
    deliveryNotifications: true,
    smsAlerts: false,
    maxDeliveryRadius: 50,
    standardDeliveryTime: 2
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Mock data - replace with actual API call
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof LogisticsSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your logistics operations and preferences.
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Delivery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your logistics company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={settings.contactPhone}
                      onChange={(e) => updateSetting('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatingHours">Operating Hours</Label>
                  <Input
                    id="operatingHours"
                    value={settings.operatingHours}
                    onChange={(e) => updateSetting('operatingHours', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operational Settings</CardTitle>
              <CardDescription>Configure logistics operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCarrier">Default Carrier</Label>
                <select
                  id="defaultCarrier"
                  value={settings.defaultCarrier}
                  onChange={(e) => updateSetting('defaultCarrier', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                  <option value="DHL">DHL</option>
                  <option value="USPS">USPS</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoDispatch"
                  checked={settings.autoDispatch}
                  onCheckedChange={(checked) => updateSetting('autoDispatch', checked)}
                />
                <Label htmlFor="autoDispatch">Auto Dispatch</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="routeOptimization"
                  checked={settings.routeOptimization}
                  onCheckedChange={(checked) => updateSetting('routeOptimization', checked)}
                />
                <Label htmlFor="routeOptimization">Route Optimization</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="realTimeTracking"
                  checked={settings.realTimeTracking}
                  onCheckedChange={(checked) => updateSetting('realTimeTracking', checked)}
                />
                <Label htmlFor="realTimeTracking">Real-time Tracking</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure delivery notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="deliveryNotifications"
                  checked={settings.deliveryNotifications}
                  onCheckedChange={(checked) => updateSetting('deliveryNotifications', checked)}
                />
                <Label htmlFor="deliveryNotifications">Delivery Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smsAlerts"
                  checked={settings.smsAlerts}
                  onCheckedChange={(checked) => updateSetting('smsAlerts', checked)}
                />
                <Label htmlFor="smsAlerts">SMS Alerts</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Configuration</CardTitle>
              <CardDescription>Set delivery parameters and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxDeliveryRadius">Max Delivery Radius (miles)</Label>
                <Input
                  id="maxDeliveryRadius"
                  type="number"
                  value={settings.maxDeliveryRadius}
                  onChange={(e) => updateSetting('maxDeliveryRadius', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standardDeliveryTime">Standard Delivery Time (days)</Label>
                <Input
                  id="standardDeliveryTime"
                  type="number"
                  value={settings.standardDeliveryTime}
                  onChange={(e) => updateSetting('standardDeliveryTime', parseInt(e.target.value))}
                />
              </div>
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