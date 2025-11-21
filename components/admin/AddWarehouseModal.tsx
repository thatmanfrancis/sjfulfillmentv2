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
import { Building, MapPin, Package, Users, Mail, Phone, Loader2 } from 'lucide-react';
import { post } from '@/lib/api';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWarehouseAdded: () => void;
}

interface WarehouseFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  region: string;
  capacity: number;
  manager: string;
  contactEmail: string;
  contactPhone: string;
  type: 'FULFILLMENT' | 'STORAGE' | 'DISTRIBUTION' | 'CROSS_DOCK' | '';
  description?: string;
}

const initialFormData: WarehouseFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
  region: '',
  capacity: 0,
  manager: '',
  contactEmail: '',
  contactPhone: '',
  type: '',
  description: ''
};

export default function AddWarehouseModal({ isOpen, onClose, onWarehouseAdded }: AddWarehouseModalProps) {
  const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof WarehouseFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Partial<Record<keyof WarehouseFormData, string>> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Warehouse name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.region.trim()) newErrors.region = 'Region is required';
    if (!formData.capacity || formData.capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    if (!formData.manager.trim()) newErrors.manager = 'Manager name is required';
    if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required';
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';
    if (!formData.type) newErrors.type = 'Warehouse type is required';

    // Email validation
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await post('/api/admin/warehouses', {
        ...formData,
        capacity: Number(formData.capacity)
      });
      
      setFormData(initialFormData);
      onWarehouseAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create warehouse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'FULFILLMENT':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Fulfillment Center' };
      case 'STORAGE':
        return { color: 'bg-green-100 text-green-700 border-green-200', label: 'Storage Facility' };
      case 'DISTRIBUTION':
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Distribution Center' };
      case 'CROSS_DOCK':
        return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Cross-Dock Terminal' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', label: type };
    }
  };

  const regions = [
    'North America',
    'South America', 
    'Europe',
    'Asia Pacific',
    'Middle East & Africa',
    'Central America',
    'Caribbean'
  ];

  const countries = [
    'United States',
    'Canada',
    'Mexico',
    'United Kingdom',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Netherlands',
    'Australia',
    'Japan',
    'Singapore',
    'South Korea',
    'China',
    'India',
    'Brazil',
    'Argentina'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border border-[#f8c017]/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-[#f8c017]/10 rounded-lg">
              <Building className="h-5 w-5 text-[#f8c017]" />
            </div>
            Add New Warehouse
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new warehouse facility to manage inventory and fulfillment operations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#f8c017]" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Essential warehouse details and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Warehouse Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter warehouse name"
                    />
                    {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300">Warehouse Type *</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select warehouse type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        <SelectItem value="FULFILLMENT">Fulfillment Center</SelectItem>
                        <SelectItem value="STORAGE">Storage Facility</SelectItem>
                        <SelectItem value="DISTRIBUTION">Distribution Center</SelectItem>
                        <SelectItem value="CROSS_DOCK">Cross-Dock Terminal</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.type && (
                      <Badge className={`${getTypeInfo(formData.type).color} border mt-2`}>
                        {getTypeInfo(formData.type).label}
                      </Badge>
                    )}
                    {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-gray-300">Storage Capacity (sq ft) *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="0"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter storage capacity"
                    />
                    {errors.capacity && <p className="text-red-400 text-sm">{errors.capacity}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-gray-300">Region *</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-gray-600">
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.region && <p className="text-red-400 text-sm">{errors.region}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter warehouse description (optional)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#f8c017]" />
                  Location Details
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Physical address and location information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-300">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter street address"
                  />
                  {errors.address && <p className="text-red-400 text-sm">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-300">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter city"
                    />
                    {errors.city && <p className="text-red-400 text-sm">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-300">State/Province *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter state"
                    />
                    {errors.state && <p className="text-red-400 text-sm">{errors.state}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-300">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter ZIP code"
                    />
                    {errors.zipCode && <p className="text-red-400 text-sm">{errors.zipCode}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-gray-300">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter country"
                  />
                  {errors.country && <p className="text-red-400 text-sm">{errors.country}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="bg-[#1a1a1a] border border-[#f8c017]/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#f8c017]" />
                  Contact Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Warehouse management and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manager" className="text-gray-300">Warehouse Manager *</Label>
                  <Input
                    id="manager"
                    value={formData.manager}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                    className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                    placeholder="Enter manager name"
                  />
                  {errors.manager && <p className="text-red-400 text-sm">{errors.manager}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-gray-300 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Email *
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter contact email"
                    />
                    {errors.contactEmail && <p className="text-red-400 text-sm">{errors.contactEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-gray-300 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Phone *
                    </Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      className="bg-[#1a1a1a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                      placeholder="Enter contact phone"
                    />
                    {errors.contactPhone && <p className="text-red-400 text-sm">{errors.contactPhone}</p>}
                  </div>
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
              'Create Warehouse'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}