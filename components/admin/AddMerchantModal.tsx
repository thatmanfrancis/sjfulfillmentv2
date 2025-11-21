'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, User, Mail, Phone, MapPin, 
  AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';
import { post } from '@/lib/api';

interface Country {
  name: {
    common: string;
  };
  cca2: string;
}

interface State {
  name: string;
  state_code: string;
}

interface LGA {
  name: string;
}

interface AddMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerchantAdded: () => void;
}

export default function AddMerchantModal({ isOpen, onClose, onMerchantAdded }: AddMerchantModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Location data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  
  const [merchantData, setMerchantData] = useState({
    // Business Information
    businessName: '',
    businessPhone: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    
    // Primary Contact (Admin User)
    firstName: '',
    lastName: '',
    email: '',
    
    // Business Settings
    currency: 'USD' as 'USD' | 'NGN' | 'GBP' | 'EUR' | 'CAD'
  });

  // Fetch countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data: Country[] = await response.json();
        const sortedCountries = data.sort((a, b) => 
          a.name.common.localeCompare(b.name.common)
        );
        setCountries(sortedCountries);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      }
    };

    if (isOpen) {
      fetchCountries();
    }
  }, [isOpen]);

  // Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (merchantData.businessAddress.country) {
        setLoadingStates(true);
        try {
          // For Nigeria, use specific API
          if (merchantData.businessAddress.country === 'Nigeria') {
            const response = await fetch('https://nga-states-lga.onrender.com/fetch');
            const data = await response.json();
            console.log('Nigeria states data:', data);
            // Nigeria API returns array of strings, convert to objects
            const statesData = data.map((stateName: string) => ({
              name: stateName,
              state_code: stateName
            }));
            setStates(statesData);
          } else {
            // For other countries, use a general API
            try {
              const response = await fetch(`https://countriesnow.space/api/v0.1/countries/states`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  country: merchantData.businessAddress.country
                })
              });
              const data = await response.json();
              console.log('States data for', merchantData.businessAddress.country, ':', data);
              if (data.data && data.data.states && Array.isArray(data.data.states)) {
                setStates(data.data.states.map((state: any) => ({
                  name: state.name,
                  state_code: state.state_code || state.name
                })));
              } else {
                console.warn('No states found for country:', merchantData.businessAddress.country);
                setStates([]);
              }
            } catch (error) {
              console.error('Failed to fetch states for', merchantData.businessAddress.country, error);
              setStates([]);
            }
          }
        } catch (error) {
          console.error('Failed to fetch states:', error);
          setStates([]);
        } finally {
          setLoadingStates(false);
        }
      } else {
        setStates([]);
        // setLgas([]);
      }
    };

    fetchStates();
  }, [merchantData.businessAddress.country]);

  // Fetch cities/LGAs when state changes - Removed since city is now text input
  // Cities will be manually typed by the user

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('businessAddress.')) {
      const addressField = field.split('.')[1];
      setMerchantData(prev => {
        const newData = {
          ...prev,
          businessAddress: {
            ...prev.businessAddress,
            [addressField]: value
          }
        };
        
        // Reset dependent fields when parent field changes
        if (addressField === 'country') {
          newData.businessAddress.state = '';
          newData.businessAddress.city = '';
          // Reset states array to prevent stale data
          setStates([]);
        } else if (addressField === 'state') {
          newData.businessAddress.city = '';
        }
        
        return newData;
      });
    } else {
      setMerchantData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    // Basic validation
    if (!merchantData.businessName || !merchantData.email || !merchantData.firstName || !merchantData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const result = await post('/api/admin/merchants', merchantData);
      
      if (result) {
        onMerchantAdded();
        onClose();
        // Reset all form data and arrays
        setMerchantData({
          businessName: '',
          businessPhone: '',
          businessAddress: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          },
          firstName: '',
          lastName: '',
          email: '',
          currency: 'USD'
        });
        setStates([]);
      }
    } catch (error: any) {
      console.error('Failed to create merchant:', error);
      setError(error?.message || 'Failed to create merchant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-[#f8c017]" />
            Add New Merchant
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new merchant account with business details and primary contact information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#f8c017]" />
              Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  Business Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="Enter business name"
                  value={merchantData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">Business Phone</Label>
                <Input
                  placeholder="+234 xxx xxx xxxx"
                  value={merchantData.businessPhone}
                  onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">Currency</Label>
                <select
                  value={merchantData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full h-10 px-3 bg-[#2a2a2a] border border-gray-600 rounded-md text-white focus:border-[#f8c017] focus:ring-[#f8c017]"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#f8c017]" />
              Business Address
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-gray-300">Street Address</Label>
                <Input
                  placeholder="Enter street address"
                  value={merchantData.businessAddress.street}
                  onChange={(e) => handleInputChange('businessAddress.street', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              {/* Country - First Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">Country</Label>
                <Select
                  value={merchantData.businessAddress.country}
                  onValueChange={(value) => handleInputChange('businessAddress.country', value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-black hover:bg-gray-50" style={{backgroundColor: 'white', color: 'black'}}>
                    <SelectValue placeholder="Select Country" className="text-black" style={{color: 'black'}} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 max-h-48 text-black" style={{backgroundColor: 'white', color: 'black'}}>
                    {countries.length > 0 ? (
                      countries.map((country) => (
                        <SelectItem 
                          key={country.cca2} 
                          value={country.name.common} 
                          className="text-black hover:bg-gray-100 focus:bg-gray-100 focus:text-black data-[highlighted]:bg-gray-100 data-[highlighted]:text-black"
                          style={{color: 'black', backgroundColor: 'white'}}
                        >
                          {country.name.common}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled className="text-gray-500">
                        Loading countries...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* State - Second Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">State/Province</Label>
                {merchantData.businessAddress.country ? (
                  <Select
                    value={merchantData.businessAddress.state}
                    onValueChange={(value) => handleInputChange('businessAddress.state', value)}
                    disabled={loadingStates}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-black hover:bg-gray-50" style={{backgroundColor: 'white', color: 'black'}}>
                      <SelectValue placeholder={loadingStates ? "Loading states..." : "Select State/Province"} className="text-black" style={{color: 'black'}} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300 max-h-48 text-black" style={{backgroundColor: 'white', color: 'black'}}>
                      {loadingStates ? (
                        <SelectItem value="loading" disabled className="text-gray-500">
                          <div className="flex items-center gap-2" style={{color: 'gray'}}>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading states...
                          </div>
                        </SelectItem>
                      ) : states.length > 0 ? (
                        states.map((state, index) => (
                          <SelectItem 
                            key={`${state.name}-${index}`} 
                            value={state.name} 
                            className="text-black hover:bg-gray-100 focus:bg-gray-100 focus:text-black cursor-pointer"
                            style={{color: 'black', backgroundColor: 'white'}}
                          >
                            <span style={{color: 'black', fontSize: '14px'}}>{state.name}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-states" disabled className="text-gray-500">
                          <span style={{color: 'gray'}}>No states available</span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Select country first"
                    disabled
                    className="bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                  />
                )}
              </div>

              {/* City/LGA - Text Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  {merchantData.businessAddress.country === 'Nigeria' ? 'LGA' : 'City'}
                </Label>
                <Input
                  placeholder={`Enter ${merchantData.businessAddress.country === 'Nigeria' ? 'LGA' : 'city'} name`}
                  value={merchantData.businessAddress.city}
                  onChange={(e) => handleInputChange('businessAddress.city', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">ZIP/Postal Code</Label>
                <Input
                  placeholder="Enter ZIP/postal code"
                  value={merchantData.businessAddress.zipCode}
                  onChange={(e) => handleInputChange('businessAddress.zipCode', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-[#f8c017]" />
              Primary Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="Enter first name"
                  value={merchantData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  Last Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="Enter last name"
                  value={merchantData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  Email Address <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={merchantData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 bg-[#2a2a2a] border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 text-blue-400 text-sm bg-blue-400/10 border border-blue-400/20 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 mt-0.5" />
            <div>
              <strong>Account Setup:</strong> A temporary password will be generated and sent to the merchant's email address. 
              They will be prompted to set a new password on first login.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:border-gray-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !merchantData.businessName || !merchantData.email || !merchantData.firstName || !merchantData.lastName}
              className="bg-[#f8c017] text-black hover:bg-[#f8c017]/90"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                  Creating Merchant...
                </div>
              ) : (
                'Create Merchant'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}