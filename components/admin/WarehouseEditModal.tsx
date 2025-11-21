'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { put } from '@/lib/api';

interface Warehouse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  region: string;
  capacity: number;
  currentStock: number;
  manager?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'UNDER_CONSTRUCTION';
  type: 'FULFILLMENT' | 'STORAGE' | 'DISTRIBUTION' | 'CROSS_DOCK';
  description?: string;
  createdAt: string;
  updatedAt: string;
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
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'UNDER_CONSTRUCTION';
  type: 'FULFILLMENT' | 'STORAGE' | 'DISTRIBUTION' | 'CROSS_DOCK';
  description: string;
}

interface WarehouseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onUpdated: () => void;
}

export default function WarehouseEditModal({ isOpen, onClose, warehouse, onUpdated }: WarehouseEditModalProps) {
  const [formData, setFormData] = useState<WarehouseFormData>({
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
    status: 'ACTIVE',
    type: 'STORAGE',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof WarehouseFormData, string>>>({});

  useEffect(() => {
    if (isOpen && warehouse) {
      setFormData({
        name: warehouse.name,
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        zipCode: warehouse.zipCode || '',
        country: warehouse.country || 'United States',
        region: warehouse.region,
        capacity: warehouse.capacity,
        manager: warehouse.manager || '',
        contactEmail: warehouse.contactEmail || '',
        contactPhone: warehouse.contactPhone || '',
        status: warehouse.status,
        type: warehouse.type,
        description: warehouse.description || ''
      });
      setErrors({});
    }
  }, [isOpen, warehouse]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof WarehouseFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }
    if (!formData.region.trim()) {
      newErrors.region = 'Region is required';
    }
    if (formData.capacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouse || !validateForm()) return;

    try {
      setLoading(true);
      
      const updateData = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        region: formData.region.trim(),
        capacity: formData.capacity,
        manager: formData.manager.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        status: formData.status,
        type: formData.type,
        description: formData.description.trim() || undefined,
      };

      await put(`/api/admin/warehouses/${warehouse.id}`, updateData);
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to update warehouse:', error);
      setErrors({ name: error.message || 'Failed to update warehouse' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WarehouseFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border border-gray-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Warehouse</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update the warehouse information below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
              Basic Information
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Warehouse Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter warehouse name"
                />
                {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="region" className="text-gray-300">
                  Region *
                </Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter region"
                />
                {errors.region && <p className="text-red-400 text-sm">{errors.region}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-300">
                  Status *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-black focus:border-[#f8c017] focus:ring-[#f8c017]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300">
                    <SelectItem value="ACTIVE" className="text-black hover:bg-gray-100">Active</SelectItem>
                    <SelectItem value="INACTIVE" className="text-black hover:bg-gray-100">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE" className="text-black hover:bg-gray-100">Maintenance</SelectItem>
                    <SelectItem value="UNDER_CONSTRUCTION" className="text-black hover:bg-gray-100">Under Construction</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-red-400 text-sm">{errors.status}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-gray-300">
                  Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-black focus:border-[#f8c017] focus:ring-[#f8c017]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300">
                    <SelectItem value="FULFILLMENT" className="text-black hover:bg-gray-100">Fulfillment</SelectItem>
                    <SelectItem value="STORAGE" className="text-black hover:bg-gray-100">Storage</SelectItem>
                    <SelectItem value="DISTRIBUTION" className="text-black hover:bg-gray-100">Distribution</SelectItem>
                    <SelectItem value="CROSS_DOCK" className="text-black hover:bg-gray-100">Cross Dock</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-gray-300">
                Capacity *
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                placeholder="Enter capacity"
              />
              {errors.capacity && <p className="text-red-400 text-sm">{errors.capacity}</p>}
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
              Location Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                placeholder="Enter address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-300">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter city"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-gray-300">
                  State
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter state"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-gray-300">
                  Zip Code
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter zip code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-300">
                Country
              </Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                placeholder="Enter country"
              />
            </div>
          </div>

          {/* Management Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
              Management Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="manager" className="text-gray-300">
                Manager
              </Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => handleInputChange('manager', e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                placeholder="Enter manager name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-gray-300">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter contact email"
                />
                {errors.contactEmail && <p className="text-red-400 text-sm">{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-gray-300">
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                  placeholder="Enter contact phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-[#2a2a2a] border-gray-600 text-white focus:border-[#f8c017] focus:ring-[#f8c017] resize-none"
                placeholder="Enter warehouse description"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:border-gray-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Warehouse
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}