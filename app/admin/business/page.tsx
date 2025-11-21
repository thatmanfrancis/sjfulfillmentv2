'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Phone, MapPin, Save, Loader2, Edit, Mail, Globe } from 'lucide-react';
import { get, post } from '@/lib/api';

interface BusinessProfile {
  id: string;
  name: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  isActive: boolean;
  onboardingStatus: string;
}

export default function AdminBusinessPage() {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
  });

  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    try {
      const data: any = await get('/api/admin/business/profile');
      
      if (data?.success && data?.business) {
        setBusiness(data.business);
        setFormData({
          name: data.business.name || '',
          contactPhone: data.business.contactPhone || '',
          address: data.business.address || '',
          city: data.business.city || '',
          state: data.business.state || '',
          country: data.business.country || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch business profile:', error);
      setMessage('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response: any = await post('/api/admin/business/profile', formData);
      
      if (response?.success) {
        setMessage('Business information updated successfully!');
        setBusiness(prev => prev ? { ...prev, ...formData } : null);
        setEditing(false);
      } else {
        setMessage('Failed to update business information');
      }
    } catch (error) {
      console.error('Update business error:', error);
      setMessage('Failed to update business information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (business) {
      setFormData({
        name: business.name || '',
        contactPhone: business.contactPhone || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        country: business.country || '',
      });
    }
    setEditing(false);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Admin - Business Management</h1>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Business Info
          </Button>
        )}
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Business Status Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Business Status</CardTitle>
            <CardDescription className="text-gray-400">
              Current status and verification information
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Account Status</Label>
                <div className="mt-1 flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    business?.isActive ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className={business?.isActive ? 'text-green-400' : 'text-yellow-400'}>
                    {business?.isActive ? 'Active' : 'Pending Approval'}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300">Onboarding Status</Label>
                <div className="mt-1">
                  <span className="text-white capitalize">
                    {business?.onboardingStatus?.toLowerCase().replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Business ID</Label>
                <div className="mt-1">
                  <span className="text-gray-400 font-mono text-sm">
                    {business?.id?.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Business Information</CardTitle>
            <CardDescription className="text-gray-400">
              {editing ? 'Update business details' : 'View business information'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-300">Business Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone" className="text-gray-300">Contact Phone</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pl-10"
                        placeholder="+234 xxx xxx xxxx"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="country" className="text-gray-300">Country</Label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pl-10"
                        placeholder="Nigeria"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-gray-300">Street Address</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white pl-10"
                      placeholder="123 Business Street"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-gray-300">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white mt-1"
                      placeholder="Lagos"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state" className="text-gray-300">State/Region</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white mt-1"
                      placeholder="Lagos State"
                    />
                  </div>
                </div>

                {message && (
                  <Alert className={`${message.includes('success') ? 'border-green-500' : 'border-red-500'}`}>
                    <AlertDescription className={message.includes('success') ? 'text-green-400' : 'text-red-400'}>
                      {message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex space-x-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Business Name</Label>
                    <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-600">
                      <span className="text-white">{business?.name || 'Not provided'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Contact Phone</Label>
                    <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-600">
                      <span className="text-white">{business?.contactPhone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Address</Label>
                  <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-600">
                    <span className="text-white">
                      {business?.address ? (
                        `${business.address}, ${business.city || ''}, ${business.state || ''}, ${business.country || ''}`
                      ) : (
                        'Address not provided'
                      )}
                    </span>
                  </div>
                </div>

                {!business?.isActive && (
                  <Alert className="border-yellow-500">
                    <AlertDescription className="text-yellow-400">
                      This business account requires admin approval.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Admin Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Administrative controls for business management
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white">
                Approve Business
              </Button>
              <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                Suspend Business
              </Button>
              <Button variant="outline">
                View Activity Log
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
