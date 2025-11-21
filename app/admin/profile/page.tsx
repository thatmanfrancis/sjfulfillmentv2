'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Shield, 
  Camera, 
  Save, 
  Lock,
  Bell,
  Palette,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Edit2,
  UserCheck,
  Key,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import { get, patch } from '@/lib/api';
import { Switch } from '@/components/ui/switch';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  businessId?: string;
  profileImage?: string;
  bio?: string;
  department?: string;
  position?: string;
  location?: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    type: string;
  };
}

interface SecurityLog {
  id: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    department: '',
    position: '',
    location: '',
    timezone: '',
    language: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: true,
    compactView: false,
  });

  useEffect(() => {
    fetchProfile();
    fetchSecurityLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'security' && profile?.role === 'MERCHANT') {
      fetchApiKeys();
    }
  }, [activeTab, profile?.role]);

  const fetchProfile = async () => {
    try {
      const response = await get<{success: boolean, user: UserProfile} | UserProfile>('/api/user/profile');
      // Handle both wrapped and unwrapped responses
      let data: UserProfile;
      if ('user' in response && 'success' in response) {
        data = response.user;
      } else {
        data = response as UserProfile;
      }
      
      setProfile(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        department: data.department || '',
        position: data.position || '',
        location: data.location || '',
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
      });
      setPreferences({
        emailNotifications: data.emailNotifications ?? true,
        smsNotifications: data.smsNotifications ?? false,
        darkMode: false,
        compactView: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      // Don't set loading to false if it's an auth error - redirect will handle it
      if (error?.status === 401) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const data = await get<{logs: SecurityLog[]}>('/api/security-logs') as {logs: SecurityLog[]};
      setSecurityLogs(data.logs || []);
    } catch (error: any) {
      console.error('Failed to fetch security logs:', error);
      // Silently fail for security logs on auth errors
      if (error?.status === 401) {
        return;
      }
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await patch('/api/user/profile', {
        ...formData,
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
      });
      
      await fetchProfile();
      setEditMode(false);
      // Show success message
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(prev => prev ? { ...prev, profileImage: result.profileImage } : null);
      } else {
        const error = await response.json();
        console.error('Avatar upload failed:', error.error);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordError('');
        // Show success message
        alert('Password changed successfully!');
      } else {
        const error = await response.json();
        setPasswordError(error.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
    }
  };

  const fetchApiKeys = async () => {
    if (profile?.role !== 'MERCHANT') return;
    
    setLoadingApiKeys(true);
    try {
      const response = await get<{apiKeys: any[]}>('/api/merchant/api-keys');
      setApiKeys(response.apiKeys || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const response = await fetch('/api/merchant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Default API Key',
          description: 'Auto-generated API key for merchant access'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`API Key generated: ${result.apiKey.apiKey}\n\nPlease save this key securely. It won't be shown again.`);
        fetchApiKeys();
      } else {
        const error = await response.json();
        console.error('API key generation failed:', error);
        alert(`Failed to generate API key: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('Network error while generating API key');
    }
  };

  const handleToggleMFA = async () => {
    setMfaLoading(true);
    try {
      const response = await fetch('/api/auth/toggle-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !profile?.twoFactorEnabled })
      });

      if (response.ok) {
        await fetchProfile();
      } else {
        const error = await response.json();
        console.error('MFA toggle failed:', error);
      }
    } catch (error) {
      console.error('MFA toggle error:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleNotificationToggle = async (type: 'email' | 'sms', enabled: boolean) => {
    setNotificationLoading(true);
    try {
      const updateData = {
        [type === 'email' ? 'emailNotifications' : 'smsNotifications']: enabled
      };

      await patch('/api/user/notification-preferences', updateData);
      
      // Update local state
      setPreferences(prev => ({
        ...prev,
        [type === 'email' ? 'emailNotifications' : 'smsNotifications']: enabled
      }));
      
      // Update profile state as well
      setProfile(prev => prev ? {
        ...prev,
        [type === 'email' ? 'emailNotifications' : 'smsNotifications']: enabled
      } : null);
      
    } catch (error) {
      console.error('Failed to update notification preference:', error);
    } finally {
      setNotificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Profile</h1>
            <p className="text-gray-400">Manage your account settings and preferences</p>
          </div>
          <Button 
            onClick={() => setEditMode(!editMode)}
            className={editMode ? "bg-red-600 hover:bg-red-700" : "gradient-gold text-black font-semibold"}
          >
            {editMode ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                View Mode
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card className="border-brand-black/20 bg-gradient-black hover:shadow-gold-lg transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-100 border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                  {profile?.profileImage ? (
                    <img 
                      src={profile.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : profile?.firstName && profile?.lastName ? (
                    <span className="text-2xl font-bold text-gray-600">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </span>
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                {editMode && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                      disabled={uploadingAvatar}
                    />
                    <label htmlFor="avatar-upload">
                      <Button 
                        size="sm" 
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-gold text-black hover:bg-brand-gold/80 cursor-pointer"
                        disabled={uploadingAvatar}
                        asChild
                      >
                        <div>
                          <Camera className="w-4 h-4" />
                        </div>
                      </Button>
                    </label>
                  </>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    {profile?.firstName} {profile?.lastName}
                  </h2>
                  <Badge 
                    variant="outline" 
                    className="text-brand-gold border-brand-gold"
                  >
                    {profile?.role}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-gold" />
                    <span>{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-brand-gold" />
                      <span>{profile?.phone}</span>
                    </div>
                  )}
                  {profile?.business && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand-gold" />
                      <span>{profile.business.name}</span>
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                        {profile.business.type}
                      </Badge>
                    </div>
                  )}
                  {profile?.lastLogin && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-gold" />
                      <span>Last login: {new Date(profile.lastLogin).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-400 mb-2">Member since</div>
                <div className="text-white font-medium">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-brand-black/50 border-brand-black/20">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-gray-300"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-gray-300"
            >
              <Bell className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-gray-300"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-gray-300"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-gray-300"
            >
              <Clock className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card className="border-brand-black/20 bg-gradient-black">
                <CardHeader>
                  <CardTitle className="text-brand-gold flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">First Name</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        disabled={!editMode}
                        className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Last Name</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        disabled={!editMode}
                        className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Email Address</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Phone Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Bio</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card className="border-brand-black/20 bg-gradient-black">
                <CardHeader>
                  <CardTitle className="text-brand-gold flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Professional Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your role and business details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Department</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., Operations"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Position</Label>
                    <Input
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., Operations Manager"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={!editMode}
                      className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., New York, NY"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Timezone</Label>
                      <Select 
                        value={formData.timezone} 
                        onValueChange={(value) => handleInputChange('timezone', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gradient-black border-brand-black/20">
                          <SelectItem value="UTC" className="text-white hover:bg-brand-gold/10">UTC</SelectItem>
                          <SelectItem value="America/New_York" className="text-white hover:bg-brand-gold/10">EST</SelectItem>
                          <SelectItem value="America/Chicago" className="text-white hover:bg-brand-gold/10">CST</SelectItem>
                          <SelectItem value="America/Denver" className="text-white hover:bg-brand-gold/10">MST</SelectItem>
                          <SelectItem value="America/Los_Angeles" className="text-white hover:bg-brand-gold/10">PST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Language</Label>
                      <Select 
                        value={formData.language} 
                        onValueChange={(value) => handleInputChange('language', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className="bg-brand-black/40 border-brand-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gradient-black border-brand-black/20">
                          <SelectItem value="en" className="text-white hover:bg-brand-gold/10">English</SelectItem>
                          <SelectItem value="es" className="text-white hover:bg-brand-gold/10">Spanish</SelectItem>
                          <SelectItem value="fr" className="text-white hover:bg-brand-gold/10">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {editMode && (
              <div className="flex justify-end gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditMode(false)}
                  className="border-brand-black/20 text-gray-300 hover:bg-brand-black/40"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="gradient-gold text-black font-semibold hover:shadow-gold"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-brand-black/20 bg-gradient-black">
              <CardHeader>
                <CardTitle className="text-brand-gold flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage how you receive notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-400">Receive updates via email</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notificationLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                      )}
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => handleNotificationToggle('email', checked)}
                        disabled={notificationLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">SMS Notifications</h4>
                      <p className="text-sm text-gray-400">Receive alerts via text message</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notificationLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                      )}
                      <Switch
                        checked={preferences.smsNotifications}
                        onCheckedChange={(checked) => handleNotificationToggle('sms', checked)}
                        disabled={notificationLoading}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-brand-black/20 bg-gradient-black">
                <CardHeader>
                  <CardTitle className="text-brand-gold flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Security Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your account security and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {mfaLoading && (
                          <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
                        )}
                        <Switch
                          checked={profile?.twoFactorEnabled ?? false}
                          onCheckedChange={handleToggleMFA}
                          disabled={mfaLoading}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">Password</h4>
                        <p className="text-sm text-gray-400">Change your account password</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-brand-black/20 text-gray-300 hover:bg-brand-gold/10"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border border-gray-200 text-gray-900">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900">Change Password</DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Enter your current password and choose a new one
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {passwordError && (
                              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                                {passwordError}
                              </div>
                            )}
                            <div>
                              <Label className="text-gray-700">Current Password</Label>
                              <Input 
                                type="password" 
                                placeholder="Enter current password"
                                className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">New Password</Label>
                              <Input 
                                type="password" 
                                placeholder="Enter new password"
                                className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700">Confirm New Password</Label>
                              <Input 
                                type="password" 
                                placeholder="Confirm new password"
                                className="bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-3 pt-4">
                              <Button 
                                variant="outline" 
                                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                  setPasswordError('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                onClick={handlePasswordChange}
                                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                              >
                                Update Password
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-brand-black/20 bg-gradient-black">
                <CardHeader>
                  <CardTitle className="text-brand-gold flex items-center">
                    <Key className="w-5 h-5 mr-2" />
                    API Keys
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your API access keys for integrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.role === 'MERCHANT' ? (
                    <div>
                      {loadingApiKeys ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto"></div>
                        </div>
                      ) : apiKeys.length > 0 ? (
                        <div className="space-y-3">
                          {apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-3 border border-brand-black/20 rounded-lg">
                              <div>
                                <p className="text-white font-medium">{key.name}</p>
                                <p className="text-sm text-gray-400">{key.apiKey}</p>
                                <p className="text-xs text-gray-500">
                                  Created: {new Date(key.createdAt || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge 
                                variant={key.isRevoked ? "destructive" : "default"}
                                className={key.isRevoked ? "" : "bg-green-600 text-white"}
                              >
                                {key.isRevoked ? 'Revoked' : 'Active'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-4">No API keys configured</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <Button 
                          onClick={handleGenerateApiKey}
                          className="bg-brand-gold text-black hover:bg-brand-gold/80"
                          disabled={loadingApiKeys}
                        >
                          Generate New API Key
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">API keys are only available for merchant accounts</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {profile?.role === 'MERCHANT' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-brand-black/20 bg-gradient-black">
                  <CardHeader>
                    <CardTitle className="text-brand-gold flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Current Pricing
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Your current pricing tiers and rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-brand-black/20 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">Standard Shipping</h4>
                          <p className="text-sm text-gray-400">Regular delivery service</p>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">$2.50/kg</div>
                          <div className="text-xs text-gray-400">Base rate</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border border-brand-black/20 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">Express Shipping</h4>
                          <p className="text-sm text-gray-400">Fast delivery service</p>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">$4.00/kg</div>
                          <div className="text-xs text-gray-400">Base rate</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border border-brand-black/20 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">Premium Shipping</h4>
                          <p className="text-sm text-gray-400">Same-day delivery</p>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">$6.50/kg</div>
                          <div className="text-xs text-gray-400">Base rate</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-brand-black/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Minimum charge:</span>
                        <span className="text-white">$5.00</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Rate per km:</span>
                        <span className="text-white">$1.25</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Currency:</span>
                        <span className="text-white">USD</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-brand-black/20 bg-gradient-black">
                  <CardHeader>
                    <CardTitle className="text-brand-gold flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Recent Invoices
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Your billing history and payment status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                        <div>
                          <p className="text-white font-medium">November 2025</p>
                          <p className="text-sm text-gray-400">Due: Nov 30, 2025</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">$1,234.50</p>
                          <Badge className="bg-yellow-600 text-white mt-1">Pending</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                        <div>
                          <p className="text-white font-medium">October 2025</p>
                          <p className="text-sm text-gray-400">Due: Oct 31, 2025</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">$987.25</p>
                          <Badge className="bg-green-600 text-white mt-1">Paid</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-brand-black/20 rounded-lg">
                        <div>
                          <p className="text-white font-medium">September 2025</p>
                          <p className="text-sm text-gray-400">Due: Sep 30, 2025</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">$1,456.75</p>
                          <Badge className="bg-green-600 text-white mt-1">Paid</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Button 
                        className="w-full bg-brand-gold text-black hover:bg-brand-gold/80 font-semibold"
                        onClick={() => window.location.href = '/billing'}
                      >
                        View All Invoices
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-brand-black/20 bg-gradient-black">
                <CardContent className="py-12 text-center">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Billing Information</h3>
                  <p className="text-gray-400">Billing features are only available for merchant accounts</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="activity" className="space-y-6">
            <Card className="border-brand-black/20 bg-gradient-black">
              <CardHeader>
                <CardTitle className="text-brand-gold flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your recent login and security events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityLogs.length > 0 ? (
                  <div className="space-y-4">
                    {securityLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 border border-brand-black/20 rounded-lg">
                        <div className="w-2 h-2 bg-brand-gold rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{log.action}</p>
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>IP: {log.ipAddress}</p>
                            {log.location && <p>Location: {log.location}</p>}
                            <p>{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}