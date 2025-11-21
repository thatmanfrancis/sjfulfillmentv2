'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  match: boolean;
}

function SetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Password validation state
  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    match: false
  });

  // Validate password in real-time
  useEffect(() => {
    const { newPassword, confirmPassword } = formData;
    
    setValidation({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      match: newPassword === confirmPassword && newPassword.length > 0
    });
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const isFormValid = Object.values(validation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Please ensure all password requirements are met');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message);
        
        // Redirect to appropriate dashboard after short delay
        setTimeout(() => {
          // Role-based redirect
          const userRole = result.user?.role;
          if (userRole === 'ADMIN') {
            window.location.href = '/admin/dashboard';
          } else if (userRole === 'MERCHANT') {
            window.location.href = '/merchant/dashboard';
          } else if (userRole === 'LOGISTICS') {
            window.location.href = '/logistics/dashboard';
          } else {
            window.location.href = result.redirectTo || '/auth/login';
          }
        }, 2000);
      } else {
        setError(result.error || 'Failed to set password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Set password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationIndicator = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
      <CheckCircle2 className={`w-4 h-4 ${isValid ? 'text-green-600' : 'text-gray-300'}`} />
      {text}
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Password Set Successfully!</CardTitle>
            <CardDescription>
              Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription className="text-center text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
       

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Set Your Password</CardTitle>
            <CardDescription>
              Welcome! Please set a secure password for your account.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter your new password"
                    className="pr-12 border border-[#f08c17]"
                    required
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
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password"
                    className="pr-12 border border-[#f08c17]"
                    required
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

              {/* Password Requirements */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
                <div className="space-y-2">
                  <ValidationIndicator isValid={validation.minLength} text="At least 8 characters" />
                  <ValidationIndicator isValid={validation.hasUppercase} text="One uppercase letter" />
                  <ValidationIndicator isValid={validation.hasLowercase} text="One lowercase letter" />
                  <ValidationIndicator isValid={validation.hasNumber} text="One number" />
                  <ValidationIndicator isValid={validation.match} text="Passwords match" />
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={isLoading || !isFormValid}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Continue'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Support */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Need help? Contact{' '}
          <a href="mailto:support@sjfulfillment.com" className="text-blue-600 hover:underline">
            support@sjfulfillment.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading...</div></div>}>
      <SetPasswordComponent />
    </Suspense>
  );
}