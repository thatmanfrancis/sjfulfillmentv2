'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from'); // Don't default to /dashboard
  const message = searchParams.get('message');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if this is a first-time login requiring password setup
        if (result.isFirstTimeLogin && result.requiresPasswordSetup) {
          router.push('/auth/set-password');
          return;
        }
        
        // Check if MFA is required
        if (result.mfaRequired) {
          router.push(`/auth/verify-mfa?token=${result.tempToken}`);
        } else {
          // Redirect based on user role from the response
          const userRole = result.user?.role;
          let redirectUrl = '/auth/login'; // fallback
          
          switch (userRole) {
            case 'ADMIN':
              redirectUrl = '/admin/dashboard';
              break;
            case 'MERCHANT':
              redirectUrl = '/merchant/dashboard';
              break;
            case 'LOGISTICS':
              redirectUrl = '/logistics/dashboard';
              break;
            default:
              console.warn('Unknown user role:', userRole);
              redirectUrl = '/auth/login';
          }
          
          console.log('🔄 Redirecting to:', redirectUrl, 'for role:', userRole);
          // Force a full page navigation to trigger middleware
          window.location.href = redirectUrl;
        }
      } else {
        setError(result.error || 'Login failed. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Logo for mobile */}
      <div className="text-center lg:hidden mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#f8c017] rounded-lg flex items-center justify-center">
            {/* Logo image will go here */}
            <img src="/sjflogo.png" alt="Sjf" />
            <div className="w-8 h-8 bg-black/20 rounded"></div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full border border-[#f08c17]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full pr-10 border border-[#f08c17]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-4 h-4 text-[#f8c017] border-gray-300 rounded focus:ring-[#f8c017]"
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div>
              
              <Link
                href="/auth/forgot-password"
                className="text-sm text-[#f8c017] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-6 pt-6">
            <Button
              type="submit"
              className="w-full bg-[#f08c17] hover:bg-gray-800 text-white border-2 border-transparent hover:border-[#f8c017] transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            {/* <div className="text-center text-sm text-white">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-[#f8c017] hover:underline font-medium">
                Sign up
              </Link>
            </div> */}
          </CardFooter>
        </form>
      </Card>

      {/* Additional help */}
      <div className="text-center text-sm text-gray-500">
        Need help? Contact{' '}
        <a href="mailto:support@sjfulfillment.com" className="text-[#f8c017] hover:underline font-medium">
          support@sjfulfillment.com
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}