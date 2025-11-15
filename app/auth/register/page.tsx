'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Business Information
    businessName: '',
    businessType: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    
    // Admin User Information
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    
    // Terms and Privacy
    agreedToTerms: false,
    agreedToPrivacy: false
  });

  const router = useRouter();

  const businessTypes = [
    'E-commerce',
    'Retail',
    'Manufacturing',
    'Wholesale',
    'Dropshipping',
    'Marketplace Seller',
    'Other'
  ];

  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 
    'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 
    'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 
    'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const validateStep1 = () => {
    const requiredFields = ['businessName', 'businessType', 'contactEmail', 'contactPhone', 'address', 'city', 'state'];
    return requiredFields.every(field => formData[field as keyof typeof formData]);
  };

  const validateStep2 = () => {
    const { firstName, lastName, email, phoneNumber, password, confirmPassword } = formData;
    
    if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword) {
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 1) {
      setError('Please fill in all required business information');
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.agreedToTerms || !formData.agreedToPrivacy) {
      setError('Please agree to the terms and conditions and privacy policy');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! Please check your email to verify your account.');
        setTimeout(() => {
          router.push('/auth/login?message=Please verify your email before signing in');
        }, 3000);
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderStep1 = () => (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            name="businessName"
            placeholder="Your business name"
            value={formData.businessName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Select value={formData.businessType} onValueChange={(value) => handleSelectChange('businessType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Business Email *</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="business@example.com"
              value={formData.contactEmail}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Business Phone *</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="+234 xxx xxxx xxx"
              value={formData.contactPhone}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Business Address *</Label>
          <Input
            id="address"
            name="address"
            placeholder="Street address"
            value={formData.address}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Select value={formData.state} onValueChange={(value) => handleSelectChange('state', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {nigerianStates.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              disabled
            />
          </div>
        </div>
      </div>
    </CardContent>
  );

  const renderStep2 = () => (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Your first name"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Your last name"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Admin Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@yourcompany.com"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number *</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          placeholder="+234 xxx xxxx xxx"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-600">
          Password must be at least 8 characters long
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
      </div>
    </CardContent>
  );

  const renderStep3 = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Almost Ready!</h3>
          <p className="text-gray-600">
            Review your information and agree to our terms to complete registration
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-semibold text-sm text-gray-700">Business Information</h4>
          <p className="text-sm">{formData.businessName} ({formData.businessType})</p>
          <p className="text-sm text-gray-600">
            {formData.address}, {formData.city}, {formData.state}
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm text-gray-700">Admin User</h4>
          <p className="text-sm">{formData.firstName} {formData.lastName}</p>
          <p className="text-sm text-gray-600">{formData.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            id="agreedToTerms"
            name="agreedToTerms"
            type="checkbox"
            checked={formData.agreedToTerms}
            onChange={handleInputChange}
            className="w-4 h-4 text-[#f8c017] border-gray-300 rounded focus:ring-[#f8c017] mt-1"
          />
          <Label htmlFor="agreedToTerms" className="text-sm">
            I agree to the{' '}
            <Link href="/terms" className="text-[#f8c017] hover:underline font-medium">"
              Terms and Conditions
            </Link>
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <input
            id="agreedToPrivacy"
            name="agreedToPrivacy"
            type="checkbox"
            checked={formData.agreedToPrivacy}
            onChange={handleInputChange}
            className="w-4 h-4 text-[#f8c017] border-gray-300 rounded focus:ring-[#f8c017] mt-1"
          />
          <Label htmlFor="agreedToPrivacy" className="text-sm">
            I agree to the{' '}
            <Link href="/privacy" className="text-[#f8c017] hover:underline font-medium">"
              Privacy Policy
            </Link>
          </Label>
        </div>
      </div>
    </CardContent>
  );

  return (
    <div className="space-y-6">
      {/* Logo for mobile */}
      <div className="text-center lg:hidden mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#f8c017] rounded-lg flex items-center justify-center">
            {/* Logo image will go here */}
            <div className="w-8 h-8 bg-black/20 rounded"></div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {currentStep === 1 && "Business Information"}
            {currentStep === 2 && "Admin Account"}
            {currentStep === 3 && "Complete Registration"}
          </CardTitle>
          <CardDescription className="text-center">
            Step {currentStep} of 3
          </CardDescription>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#f8c017] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </CardHeader>

        {error && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {success && (
          <div className="px-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        <CardFooter className="flex flex-col space-y-6 pt-6">
          <div className="flex space-x-4 w-full">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-black hover:bg-gray-800 text-white border-2 border-transparent hover:border-[#f8c017] transition-all duration-200"
                disabled={isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-black hover:bg-gray-800 text-white border-2 border-transparent hover:border-[#f8c017] transition-all duration-200"
                disabled={isLoading || !formData.agreedToTerms || !formData.agreedToPrivacy}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#f8c017] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}