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
  Settings, Shield, Bell, Database, Mail, Key, Server,
  Globe, Users, Palette, Zap, Info, AlertTriangle,
  FileText, Code, Loader2
} from 'lucide-react';
import { post } from '@/lib/api';

interface AddSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingAdded: () => void;
}

interface SettingFormData {
  key: string;
  name: string;
  description: string;
  value: string | number | boolean;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'EMAIL' | 'URL' | 'PASSWORD' | '';
  category: 'GENERAL' | 'SECURITY' | 'NOTIFICATIONS' | 'PAYMENTS' | 'EMAIL' | 'SMS' | 'API' | 'THEME' | 'PERFORMANCE' | '';
  scope: 'GLOBAL' | 'ADMIN' | 'MERCHANT' | 'LOGISTICS' | 'CUSTOMER' | '';
  isPublic: boolean;
  isEditable: boolean;
  isRequired: boolean;
  defaultValue: string | number | boolean;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: string;
  };
}

const initialFormData: SettingFormData = {
  key: '',
  name: '',
  description: '',
  value: '',
  type: '',
  category: '',
  scope: '',
  isPublic: false,
  isEditable: true,
  isRequired: false,
  defaultValue: '',
  validationRules: {}
};

export default function AddSettingModal({ isOpen, onClose, onSettingAdded }: AddSettingModalProps) {
  const [formData, setFormData] = useState<SettingFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SettingFormData, string>>>({});
  const [jsonValue, setJsonValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Partial<Record<keyof SettingFormData, string>> = {};
    
    if (!formData.key.trim()) newErrors.key = 'Setting key is required';
    if (!formData.name.trim()) newErrors.name = 'Setting name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.scope) newErrors.scope = 'Scope is required';
    
    // Key validation - should be alphanumeric with underscores/dots
    if (formData.key && !/^[a-zA-Z][a-zA-Z0-9_\.]*$/.test(formData.key)) {
      newErrors.key = 'Key must start with a letter and contain only letters, numbers, underscores, or dots';
    }

    // Type-specific value validation
    if (formData.type === 'EMAIL' && formData.value && !/\S+@\S+\.\S+/.test(formData.value.toString())) {
      newErrors.value = 'Invalid email format';
    }
    if (formData.type === 'URL' && formData.value && !/^https?:\/\/.+/.test(formData.value.toString())) {
      newErrors.value = 'Invalid URL format';
    }
    if (formData.type === 'NUMBER' && formData.value !== '' && isNaN(Number(formData.value))) {
      newErrors.value = 'Value must be a valid number';
    }
    if (formData.type === 'JSON' && jsonValue) {
      try {
        JSON.parse(jsonValue);
      } catch (error) {
        newErrors.value = 'Invalid JSON format';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      let finalValue = formData.value;
      
      // Process value based on type
      if (formData.type === 'NUMBER') {
        finalValue = Number(formData.value);
      } else if (formData.type === 'BOOLEAN') {
        finalValue = formData.value === true || formData.value === 'true';
      } else if (formData.type === 'JSON' && jsonValue) {
        finalValue = JSON.parse(jsonValue);
      }

      const payload = {
        ...formData,
        value: finalValue,
        defaultValue: formData.type === 'NUMBER' ? Number(formData.defaultValue) : 
                     formData.type === 'BOOLEAN' ? (formData.defaultValue === true || formData.defaultValue === 'true') :
                     formData.type === 'JSON' ? (formData.defaultValue ? JSON.parse(formData.defaultValue.toString()) : null) :
                     formData.defaultValue
      };
      
      await post('/api/admin/settings', payload);
      
      setFormData(initialFormData);
      setJsonValue('');
      onSettingAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create setting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setJsonValue('');
    setErrors({});
    onClose();
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'GENERAL':
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: <Settings className="h-3 w-3" />,
          label: 'General'
        };
      case 'SECURITY':
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: <Shield className="h-3 w-3" />,
          label: 'Security'
        };
      case 'NOTIFICATIONS':
        return { 
          color: 'bg-purple-100 text-purple-700 border-purple-200', 
          icon: <Bell className="h-3 w-3" />,
          label: 'Notifications'
        };
      case 'PAYMENTS':
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: <Database className="h-3 w-3" />,
          label: 'Payments'
        };
      case 'EMAIL':
        return { 
          color: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: <Mail className="h-3 w-3" />,
          label: 'Email'
        };
      case 'SMS':
        return { 
          color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
          icon: <FileText className="h-3 w-3" />,
          label: 'SMS'
        };
      case 'API':
        return { 
          color: 'bg-pink-100 text-pink-700 border-pink-200', 
          icon: <Server className="h-3 w-3" />,
          label: 'API'
        };
      case 'THEME':
        return { 
          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
          icon: <Palette className="h-3 w-3" />,
          label: 'Theme'
        };
      case 'PERFORMANCE':
        return { 
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
          icon: <Zap className="h-3 w-3" />,
          label: 'Performance'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 border-gray-200', 
          icon: <Settings className="h-3 w-3" />,
          label: category
        };
    }
  };

  const getScopeInfo = (scope: string) => {
    switch (scope) {
      case 'GLOBAL':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Global' };
      case 'ADMIN':
        return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Admin' };
      case 'MERCHANT':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Merchant' };
      case 'LOGISTICS':
        return { color: 'bg-green-100 text-green-700 border-green-200', label: 'Logistics' };
      case 'CUSTOMER':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Customer' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: scope };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'STRING': return <FileText className="h-4 w-4 text-gray-500" />;
      case 'NUMBER': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'BOOLEAN': return <FileText className="h-4 w-4 text-green-500" />;
      case 'JSON': return <Code className="h-4 w-4 text-purple-500" />;
      case 'EMAIL': return <Mail className="h-4 w-4 text-orange-500" />;
      case 'URL': return <Globe className="h-4 w-4 text-cyan-500" />;
      case 'PASSWORD': return <Key className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const generateKeyFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      name,
      key: prev.key || generateKeyFromName(name)
    }));
  };

  const renderValueInput = () => {
    switch (formData.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id="value"
              checked={formData.value === true || formData.value === 'true'}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, value: checked }))}
            />
            <Label htmlFor="value" className="text-gray-300">
              {formData.value === true || formData.value === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );
      
      case 'NUMBER':
        return (
          <Input
            id="value"
            type="number"
            value={formData.value?.toString() || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="Enter numeric value"
          />
        );
      
      case 'PASSWORD':
        return (
          <Input
            id="value"
            type="password"
            value={formData.value?.toString() || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="Enter password value"
          />
        );
      
      case 'JSON':
        return (
          <Textarea
            id="value"
            value={jsonValue}
            onChange={(e) => setJsonValue(e.target.value)}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017] font-mono"
            placeholder="Enter valid JSON"
            rows={4}
          />
        );
      
      case 'EMAIL':
        return (
          <Input
            id="value"
            type="email"
            value={formData.value?.toString() || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="Enter email address"
          />
        );
      
      case 'URL':
        return (
          <Input
            id="value"
            type="url"
            value={formData.value?.toString() || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="https://example.com"
          />
        );
      
      default:
        return (
          <Input
            id="value"
            value={formData.value?.toString() || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
            placeholder="Enter setting value"
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border border-[#f8c017]/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Settings className="h-5 w-5 text-[#f8c017]" />
            </div>
            Add New Setting
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new configuration setting for the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#f8c017]" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define the setting's identity and basic properties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Setting Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter setting name"
                    />
                    {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key" className="text-gray-300">Setting Key *</Label>
                    <Input
                      id="key"
                      value={formData.key}
                      onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter unique setting key"
                    />
                    <p className="text-gray-500 text-sm">
                      Unique identifier for this setting (auto-generated from name)
                    </p>
                    {errors.key && <p className="text-red-400 text-sm">{errors.key}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter setting description"
                    rows={3}
                  />
                  {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300">Type *</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="STRING">String</SelectItem>
                        <SelectItem value="NUMBER">Number</SelectItem>
                        <SelectItem value="BOOLEAN">Boolean</SelectItem>
                        <SelectItem value="JSON">JSON</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                        <SelectItem value="PASSWORD">Password</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.type && (
                      <div className="flex items-center gap-2 mt-2">
                        {getTypeIcon(formData.type)}
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          {formData.type}
                        </Badge>
                      </div>
                    )}
                    {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-300">Category *</Label>
                    <Select value={formData.category} onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="SECURITY">Security</SelectItem>
                        <SelectItem value="NOTIFICATIONS">Notifications</SelectItem>
                        <SelectItem value="PAYMENTS">Payments</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="API">API</SelectItem>
                        <SelectItem value="THEME">Theme</SelectItem>
                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.category && (
                      <Badge className={`${getCategoryInfo(formData.category).color} border mt-2 flex items-center gap-1 w-fit`}>
                        {getCategoryInfo(formData.category).icon}
                        {getCategoryInfo(formData.category).label}
                      </Badge>
                    )}
                    {errors.category && <p className="text-red-400 text-sm">{errors.category}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scope" className="text-gray-300">Scope *</Label>
                    <Select value={formData.scope} onValueChange={(value: any) => setFormData(prev => ({ ...prev, scope: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="GLOBAL">Global</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MERCHANT">Merchant</SelectItem>
                        <SelectItem value="LOGISTICS">Logistics</SelectItem>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.scope && (
                      <Badge className={`${getScopeInfo(formData.scope).color} border mt-2`}>
                        {getScopeInfo(formData.scope).label}
                      </Badge>
                    )}
                    {errors.scope && <p className="text-red-400 text-sm">{errors.scope}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Value Configuration */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-[#f8c017]" />
                  Value Configuration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Set the current value and default behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-gray-300 flex items-center gap-2">
                    {formData.type && getTypeIcon(formData.type)}
                    Current Value
                  </Label>
                  {renderValueInput()}
                  {errors.value && <p className="text-red-400 text-sm">{errors.value}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultValue" className="text-gray-300">Default Value</Label>
                  <Input
                    id="defaultValue"
                    value={formData.defaultValue?.toString() || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter default value"
                  />
                  <p className="text-gray-500 text-sm">
                    Value to use when setting is reset or initially created
                  </p>
                </div>

                {/* Validation Rules */}
                {(formData.type === 'STRING' || formData.type === 'NUMBER') && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Validation Rules</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.type === 'STRING' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="minLength" className="text-gray-300 text-sm">Min Length</Label>
                            <Input
                              id="minLength"
                              type="number"
                              min="0"
                              value={formData.validationRules?.minLength || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                validationRules: { 
                                  ...prev.validationRules, 
                                  minLength: Number(e.target.value) 
                                }
                              }))}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="maxLength" className="text-gray-300 text-sm">Max Length</Label>
                            <Input
                              id="maxLength"
                              type="number"
                              min="0"
                              value={formData.validationRules?.maxLength || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                validationRules: { 
                                  ...prev.validationRules, 
                                  maxLength: Number(e.target.value) 
                                }
                              }))}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="min" className="text-gray-300 text-sm">Min Value</Label>
                            <Input
                              id="min"
                              type="number"
                              value={formData.validationRules?.min || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                validationRules: { 
                                  ...prev.validationRules, 
                                  min: Number(e.target.value) 
                                }
                              }))}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="max" className="text-gray-300 text-sm">Max Value</Label>
                            <Input
                              id="max"
                              type="number"
                              value={formData.validationRules?.max || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                validationRules: { 
                                  ...prev.validationRules, 
                                  max: Number(e.target.value) 
                                }
                              }))}
                              className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permissions & Behavior */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#f8c017]" />
                  Permissions & Behavior
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure access permissions and setting behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                    />
                    <Label htmlFor="isPublic" className="text-gray-300">
                      Public Access
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isEditable"
                      checked={formData.isEditable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEditable: checked }))}
                    />
                    <Label htmlFor="isEditable" className="text-gray-300">
                      User Editable
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRequired: checked }))}
                    />
                    <Label htmlFor="isRequired" className="text-gray-300">
                      Required Setting
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    <strong>Public Access:</strong> Setting value can be read by non-admin users<br/>
                    <strong>User Editable:</strong> Setting can be modified through the interface<br/>
                    <strong>Required Setting:</strong> Setting is essential for system operation
                  </p>
                </div>
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
            ) : (
              'Create Setting'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}