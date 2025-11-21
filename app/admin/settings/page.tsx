'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  User, 
  Shield, 
  Bell, 
  Upload, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Smartphone,
  Globe,
  Mail,
  Phone,
  Building,
  Copy,
  Check,
  Loader2
} from 'lucide-react'
import { get, put } from '@/lib/api'
import { useUser } from '@/hooks/useUser'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  bio?: string
  department?: string
  position?: string
  location?: string
  profileImage?: string
  timezone?: string
  language?: string
  emailNotifications: boolean
  smsNotifications: boolean
  mfaEnabled: boolean
  twoFactorEnabled: boolean
  role: string
  createdAt: string
}

interface ApiResponse {
  success: boolean
  user?: UserProfile
  message?: string
  qrCodeUrl?: string
  secret?: string
}

export default function SettingsPage() {
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    department: '',
    position: '',
    location: '',
    timezone: 'UTC',
    language: 'en',
    emailNotifications: true,
    smsNotifications: false
  })

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Password change modal
  const [passwordModal, setPasswordModal] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')

  // MFA setup modal
  const [mfaModal, setMfaModal] = useState(false)
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [secretCopied, setSecretCopied] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response: ApiResponse = await get('/api/user/profile')
      if (response.success && response.user) {
        setProfile(response.user)
        setProfileForm({
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          phone: response.user.phone || '',
          bio: response.user.bio || '',
          department: response.user.department || '',
          position: response.user.position || '',
          location: response.user.location || '',
          timezone: response.user.timezone || 'UTC',
          language: response.user.language || 'en',
          emailNotifications: response.user.emailNotifications ?? true,
          smsNotifications: response.user.smsNotifications ?? false
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setSaving(true)
      const response: ApiResponse = await put('/api/user/profile', profileForm)
      if (response.success && response.user) {
        setProfile(response.user)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return

    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('avatar', avatarFile)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data: ApiResponse = await response.json()
        if (data.success && data.user) {
          setProfile(prev => prev ? { ...prev, profileImage: data.user?.profileImage } : null)
          setAvatarFile(null)
          // Reset file input
          const fileInput = document.getElementById('avatar') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }
      } else {
        throw new Error('Failed to upload avatar')
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      setError('Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handlePasswordChange = async () => {
    try {
      setPasswordError('')
      
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordError('New passwords do not match')
        return
      }

      if (passwordForm.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long')
        return
      }

      const response: ApiResponse = await put('/api/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      if (response.success) {
        setPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password')
    }
  }

  const handleMfaToggle = async (enabled: boolean) => {
    try {
      if (enabled && !profile?.mfaEnabled) {
        // Setup MFA - get QR code
        const response: ApiResponse = await put('/api/user/mfa', { enabled: true })
        if (response.success) {
          setMfaQrCode(response.qrCodeUrl || '')
          setMfaSecret(response.secret || '')
          setMfaModal(true)
        }
      } else if (!enabled) {
        // Disable MFA
        const response: ApiResponse = await put('/api/user/mfa', { enabled: false })
        if (response.success) {
          setProfile(prev => prev ? { ...prev, mfaEnabled: false } : null)
        }
      }
    } catch (error: any) {
      setMfaError(error.message || 'Failed to toggle MFA')
    }
  }

  const handleMfaVerify = async () => {
    try {
      setMfaError('')
      const response: ApiResponse = await put('/api/user/mfa', { 
        enabled: true, 
        token: mfaToken 
      })
      
      if (response.success) {
        setProfile(prev => prev ? { ...prev, mfaEnabled: true } : null)
        setMfaModal(false)
        setMfaToken('')
        setMfaSecret('')
        setMfaQrCode('')
      }
    } catch (error: any) {
      setMfaError(error.message || 'Invalid verification code')
    }
  }

  const copySecretToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mfaSecret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy secret:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] p-6 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-600 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-600 rounded w-64"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] p-6 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-gray-300 text-lg">
              Manage your profile, security, and preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1.5">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Profile Active
            </Badge>
          </div>
        </div>

        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-[#2a2a2a] border-gray-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-[#f8c017] data-[state=active]:text-black">
              <Bell className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-[#f8c017]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-2 border-[#f8c017]/30">
                    <AvatarImage 
                      src={profile?.profileImage || ''} 
                      alt="Profile"
                    />
                    <AvatarFallback className="bg-[#f8c017]/20 text-[#f8c017] text-xl font-bold">
                      <img 
                        src="https://ui-avatars.com/api/?name=User&background=f8c017&color=000&size=96" 
                        alt="Default Profile" 
                        className="h-full w-full object-cover rounded-full"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">
                      {profile?.firstName} {profile?.lastName}
                    </h3>
                    <p className="text-gray-400">{profile?.email}</p>
                    <Badge variant="outline" className="border-[#f8c017]/30 text-[#f8c017]">
                      {profile?.role}
                    </Badge>
                  </div>
                  <div className="ml-auto space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="max-w-xs bg-[#1a1a1a] border-gray-600 text-white file:text-white file:bg-[#2a2a2a] file:border-gray-600"
                      />
                      {avatarFile && (
                        <Button 
                          onClick={handleAvatarUpload} 
                          disabled={avatarUploading}
                          className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
                        >
                          {avatarUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">Max 5MB, JPG/PNG/WEBP</p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-gray-300 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    rows={3}
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Work Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-gray-300 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-gray-300">Position</Label>
                    <Input
                      id="position"
                      value={profileForm.position}
                      onChange={(e) => setProfileForm({...profileForm, position: e.target.value})}
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#f8c017]" />
                  Security Settings
                </CardTitle>
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
                      <Button variant="outline" className="border-gray-600 hover:border-[#f8c017]/50">
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#2a2a2a] border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Change Password</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Enter your current password and choose a new one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                              className="bg-[#1a1a1a] border-gray-600 text-white pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                              className="bg-[#1a1a1a] border-gray-600 text-white pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            className="bg-[#1a1a1a] border-gray-600 text-white"
                          />
                        </div>
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
                          onClick={handlePasswordChange}
                          className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
                        >
                          Update Password
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* MFA Section */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f8c017]/20 rounded-lg">
                      <Smartphone className="h-5 w-5 text-[#f8c017]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-400">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {profile?.mfaEnabled && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                        Enabled
                      </Badge>
                    )}
                    <Switch
                      checked={profile?.mfaEnabled || false}
                      onCheckedChange={handleMfaToggle}
                    />
                  </div>
                </div>

                {/* MFA Setup Modal */}
                <Dialog open={mfaModal} onOpenChange={setMfaModal}>
                  <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Setup Two-Factor Authentication</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Scan the QR code or enter the secret manually in your authenticator app.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* QR Code */}
                      {mfaQrCode && (
                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrCode)}`} 
                            alt="MFA QR Code" 
                            className="w-48 h-48"
                          />
                        </div>
                      )}
                      
                      {/* Manual Entry Secret */}
                      {mfaSecret && (
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-sm">Or enter this secret manually:</Label>
                          <div className="flex items-center gap-2 p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg">
                            <code className="flex-1 text-sm text-white font-mono break-all">
                              {mfaSecret}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={copySecretToClipboard}
                              className="p-2 hover:bg-[#2a2a2a]"
                            >
                              {secretCopied ? (
                                <Check className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                          {/* {secretCopied && (
                            <p className="text-sm text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Secret copied to clipboard!
                            </p>
                          )} */}
                        </div>
                      )}
                      
                      {/* Verification Code Input */}
                      <div className="space-y-2">
                        <Label className="text-gray-300">Verification Code</Label>
                        <div className="flex gap-2 justify-center">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <Input
                              key={index}
                              type="text"
                              value={mfaToken[index] || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '')
                                if (value.length <= 1) {
                                  const newToken = mfaToken.split('')
                                  newToken[index] = value
                                  const updatedToken = newToken.join('')
                                  setMfaToken(updatedToken)
                                  
                                  // Auto-focus next input
                                  if (value && index < 5) {
                                    const nextInput = document.getElementById(`mfa-${index + 1}`) as HTMLInputElement
                                    nextInput?.focus()
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Handle backspace
                                if (e.key === 'Backspace' && !mfaToken[index] && index > 0) {
                                  const prevInput = document.getElementById(`mfa-${index - 1}`) as HTMLInputElement
                                  prevInput?.focus()
                                }
                              }}
                              onPaste={(e) => {
                                e.preventDefault()
                                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                                setMfaToken(pastedData)
                                // Focus last filled input or the last input
                                const targetIndex = Math.min(pastedData.length - 1, 5)
                                const targetInput = document.getElementById(`mfa-${targetIndex}`) as HTMLInputElement
                                targetInput?.focus()
                              }}
                              id={`mfa-${index}`}
                              className="w-12 h-12 text-center text-xl font-mono bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-1 focus:ring-[#f8c017]"
                              maxLength={1}
                            />
                          ))}
                        </div>
                      </div>
                      {mfaError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {mfaError}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMfaModal(false)
                          setMfaToken('')
                          setMfaSecret('')
                          setMfaQrCode('')
                          setSecretCopied(false)
                        }}
                        className="border-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleMfaVerify}
                        disabled={mfaToken.length !== 6}
                        className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black"
                      >
                        Verify & Enable
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-linear-to-br from-[#2a2a2a] to-[#1f1f1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#f8c017]" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#f8c017]/20 rounded-lg">
                        <Mail className="h-5 w-5 text-[#f8c017]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Email Notifications</h3>
                        <p className="text-sm text-gray-400">
                          Receive updates and alerts via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profileForm.emailNotifications}
                      onCheckedChange={(checked) => setProfileForm({...profileForm, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#f8c017]/20 rounded-lg">
                        <Smartphone className="h-5 w-5 text-[#f8c017]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">SMS Notifications</h3>
                        <p className="text-sm text-gray-400">
                          Receive critical alerts via SMS
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profileForm.smsNotifications}
                      onCheckedChange={(checked) => setProfileForm({...profileForm, smsNotifications: checked})}
                    />
                  </div>
                </div>

                {/* Language & Timezone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Language</Label>
                    <Select value={profileForm.language} onValueChange={(value) => setProfileForm({...profileForm, language: value})}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-700">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Timezone</Label>
                    <Select value={profileForm.timezone} onValueChange={(value) => setProfileForm({...profileForm, timezone: value})}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-700">
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Africa/Lagos">West Africa Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="bg-[#f8c017] hover:bg-[#f8c017]/90 text-black font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}