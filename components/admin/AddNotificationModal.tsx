'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, Mail, MessageCircle, Calendar, Users, Settings,
  Target, Send, Clock, AlertTriangle, Info, CheckCircle,
  Loader2, Smartphone, Globe
} from 'lucide-react';
import { post } from '@/lib/api';

interface AddNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationAdded: () => void;
}

interface NotificationFormData {
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'PROMOTIONAL' | 'SYSTEM' | '';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | '';
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'ALL' | '';
  audienceType: 'ALL_USERS' | 'ADMINS' | 'MERCHANTS' | 'LOGISTICS' | 'CUSTOMERS' | 'CUSTOM' | '';
  scheduledFor?: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  customAudience?: string[];
  isImmediate: boolean;
  sendToEmail: boolean;
  sendToSms: boolean;
  sendToPush: boolean;
  sendToInApp: boolean;
}

const initialFormData: NotificationFormData = {
  title: '',
  content: '',
  type: '',
  priority: '',
  channel: '',
  audienceType: '',
  scheduledFor: '',
  expiresAt: '',
  actionUrl: '',
  actionLabel: '',
  customAudience: [],
  isImmediate: true,
  sendToEmail: false,
  sendToSms: false,
  sendToPush: false,
  sendToInApp: true
};

export default function AddNotificationModal({ isOpen, onClose, onNotificationAdded }: AddNotificationModalProps) {
  const [formData, setFormData] = useState<NotificationFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NotificationFormData, string>>>({});
  const [customEmails, setCustomEmails] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Partial<Record<keyof NotificationFormData, string>> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.audienceType) newErrors.audienceType = 'Audience type is required';
    
    // Channel validation - at least one channel must be selected
    if (!formData.sendToEmail && !formData.sendToSms && !formData.sendToPush && !formData.sendToInApp) {
      newErrors.channel = 'At least one channel must be selected';
    }

    // Scheduled notification validation
    if (!formData.isImmediate && !formData.scheduledFor) {
      newErrors.scheduledFor = 'Scheduled time is required for non-immediate notifications';
    }

    // URL validation
    if (formData.actionUrl && !/^https?:\/\/.+/.test(formData.actionUrl)) {
      newErrors.actionUrl = 'Invalid URL format';
    }

    // Custom audience validation
    if (formData.audienceType === 'CUSTOM' && customEmails.trim() && !/\S+@\S+\.\S+/.test(customEmails)) {
      newErrors.customAudience = 'Invalid email format in custom audience';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const channels = [];
      if (formData.sendToEmail) channels.push('EMAIL');
      if (formData.sendToSms) channels.push('SMS');
      if (formData.sendToPush) channels.push('PUSH');
      if (formData.sendToInApp) channels.push('IN_APP');

      const payload = {
        ...formData,
        channels,
        customAudience: formData.audienceType === 'CUSTOM' ? 
          customEmails.split(',').map(email => email.trim()).filter(email => email) : [],
        scheduledFor: formData.isImmediate ? null : formData.scheduledFor,
        expiresAt: formData.expiresAt || null,
        actionUrl: formData.actionUrl || null,
        actionLabel: formData.actionLabel || null
      };
      
      await post('/api/admin/notifications', payload);
      
      setFormData(initialFormData);
      setCustomEmails('');
      onNotificationAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setCustomEmails('');
    setErrors({});
    onClose();
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'INFO':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info className="h-3 w-3" />, label: 'Information' };
      case 'WARNING':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Warning' };
      case 'ERROR':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Error' };
      case 'SUCCESS':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="h-3 w-3" />, label: 'Success' };
      case 'PROMOTIONAL':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Target className="h-3 w-3" />, label: 'Promotional' };
      case 'SYSTEM':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Settings className="h-3 w-3" />, label: 'System' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Bell className="h-3 w-3" />, label: type };
    }
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Low Priority' };
      case 'MEDIUM':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Medium Priority' };
      case 'HIGH':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'High Priority' };
      case 'URGENT':
        return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Urgent' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: priority };
    }
  };

  // Generate current date in the format required for datetime-local input
  const getMinDateTime = () => {
    return new Date().toISOString().slice(0, 16);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border border-[#f8c017]/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Bell className="h-5 w-5 text-[#f8c017]" />
            </div>
            Create New Notification
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Send targeted notifications to users across multiple channels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#f8c017]" />
                  Message Content
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define the notification message and its characteristics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-300">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter notification title"
                  />
                  {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-gray-300">Message Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter notification content"
                    rows={4}
                  />
                  {errors.content && <p className="text-red-400 text-sm">{errors.content}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300">Type *</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select notification type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="INFO">Information</SelectItem>
                        <SelectItem value="WARNING">Warning</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                        <SelectItem value="SYSTEM">System</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.type && (
                      <Badge className={`${getTypeInfo(formData.type).color} border mt-2 flex items-center gap-1 w-fit`}>
                        {getTypeInfo(formData.type).icon}
                        {getTypeInfo(formData.type).label}
                      </Badge>
                    )}
                    {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-gray-300">Priority *</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="LOW">Low Priority</SelectItem>
                        <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                        <SelectItem value="HIGH">High Priority</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.priority && (
                      <Badge className={`${getPriorityInfo(formData.priority).color} border mt-2`}>
                        {getPriorityInfo(formData.priority).label}
                      </Badge>
                    )}
                    {errors.priority && <p className="text-red-400 text-sm">{errors.priority}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actionUrl" className="text-gray-300">Action URL (Optional)</Label>
                    <Input
                      id="actionUrl"
                      type="url"
                      value={formData.actionUrl || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="https://example.com/action"
                    />
                    {errors.actionUrl && <p className="text-red-400 text-sm">{errors.actionUrl}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actionLabel" className="text-gray-300">Action Button Label</Label>
                    <Input
                      id="actionLabel"
                      value={formData.actionLabel || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, actionLabel: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Learn More, View Details, etc."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Settings */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#f8c017]" />
                  Delivery Settings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure how and when the notification is delivered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delivery Channels */}
                <div className="space-y-3">
                  <Label className="text-gray-300">Delivery Channels *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendToInApp"
                        checked={formData.sendToInApp}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToInApp: checked }))}
                      />
                      <Label htmlFor="sendToInApp" className="text-gray-300 text-sm flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        In-App
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendToEmail"
                        checked={formData.sendToEmail}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToEmail: checked }))}
                      />
                      <Label htmlFor="sendToEmail" className="text-gray-300 text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendToSms"
                        checked={formData.sendToSms}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToSms: checked }))}
                      />
                      <Label htmlFor="sendToSms" className="text-gray-300 text-sm flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        SMS
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendToPush"
                        checked={formData.sendToPush}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToPush: checked }))}
                      />
                      <Label htmlFor="sendToPush" className="text-gray-300 text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Push
                      </Label>
                    </div>
                  </div>
                  {errors.channel && <p className="text-red-400 text-sm">{errors.channel}</p>}
                </div>

                {/* Timing */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isImmediate"
                      checked={formData.isImmediate}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isImmediate: checked }))}
                    />
                    <Label htmlFor="isImmediate" className="text-gray-300">Send Immediately</Label>
                  </div>

                  {!formData.isImmediate && (
                    <div className="space-y-2">
                      <Label htmlFor="scheduledFor" className="text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule For *
                      </Label>
                      <Input
                        id="scheduledFor"
                        type="datetime-local"
                        min={getMinDateTime()}
                        value={formData.scheduledFor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                        className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      />
                      {errors.scheduledFor && <p className="text-red-400 text-sm">{errors.scheduledFor}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt" className="text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Expires At (Optional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={formData.expiresAt || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Targeting */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#f8c017]" />
                  Audience Targeting
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define who should receive this notification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audienceType" className="text-gray-300">Target Audience *</Label>
                  <Select value={formData.audienceType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, audienceType: value }))}>
                    <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-600">
                      <SelectItem value="ALL_USERS">All Users</SelectItem>
                      <SelectItem value="ADMINS">Administrators</SelectItem>
                      <SelectItem value="MERCHANTS">Merchants</SelectItem>
                      <SelectItem value="LOGISTICS">Logistics Staff</SelectItem>
                      <SelectItem value="CUSTOMERS">Customers</SelectItem>
                      <SelectItem value="CUSTOM">Custom Audience</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.audienceType && <p className="text-red-400 text-sm">{errors.audienceType}</p>}
                </div>

                {formData.audienceType === 'CUSTOM' && (
                  <div className="space-y-2">
                    <Label htmlFor="customEmails" className="text-gray-300">Custom Email Addresses</Label>
                    <Textarea
                      id="customEmails"
                      value={customEmails}
                      onChange={(e) => setCustomEmails(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter email addresses separated by commas"
                      rows={3}
                    />
                    <p className="text-gray-500 text-sm">
                      Enter multiple email addresses separated by commas
                    </p>
                    {errors.customAudience && <p className="text-red-400 text-sm">{errors.customAudience}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:border-gray-500"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : formData.isImmediate ? (
              'Send Notification'
            ) : (
              'Schedule Notification'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}