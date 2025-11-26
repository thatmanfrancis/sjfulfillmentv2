'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';

function VerifyMfaForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [tempToken, setTempToken] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      // No temp token, redirect back to login
      router.push('/auth/login');
      return;
    }
    setTempToken(token);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaToken.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempToken,
          mfaToken: mfaToken.trim()
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect based on user role
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
        
        // console.log('🔄 MFA verified, redirecting to:', redirectUrl, 'for role:', userRole);
        // Force a full page navigation to trigger middleware
        // window.location.href = redirectUrl;
        router.refresh();
      } else {
        setError(result.error || 'Invalid verification code. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 1) {
      const newToken = mfaToken.split('');
      newToken[index] = digits;
      const updatedToken = newToken.join('').slice(0, 6);
      setMfaToken(updatedToken);
      
      // Auto-focus next input
      if (digits && index < 5) {
        const nextInput = document.getElementById(`mfa-${index + 1}`) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Handle backspace
    if (e.key === 'Backspace' && !mfaToken[index] && index > 0) {
      const prevInput = document.getElementById(`mfa-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setMfaToken(pastedData);
    // Focus last filled input or the last input
    const targetIndex = Math.min(pastedData.length - 1, 5);
    const targetInput = document.getElementById(`mfa-${targetIndex}`) as HTMLInputElement;
    targetInput?.focus();
  };

  if (!tempToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo for mobile */}
      <div className="text-center lg:hidden mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#f8c017] rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#f8c017]/20 rounded-full flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-[#f8c017]" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code from your authenticator app
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label className="text-center block">Verification Code</Label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Input
                    key={index}
                    type="text"
                    value={mfaToken[index] || ''}
                    onChange={(e) => handleTokenChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    id={`mfa-${index}`}
                    className="w-12 h-12 text-center text-xl font-mono border-[#f8c017] focus:border-[#f8c017] focus:ring-[#f8c017]"
                    maxLength={1}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                Open your authenticator app and enter the 6-digit code
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#f8c017] hover:bg-[#f8c017]/90 text-black font-medium"
              disabled={isLoading || mfaToken.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-[#f8c017] hover:underline"
                onClick={() => router.push('/auth/login')}
                disabled={isLoading}
              >
                ← Back to login
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Additional help */}
      <div className="text-center text-sm text-gray-500">
        Lost your device?{' '}
        <a href="mailto:support@sjfulfillment.com" className="text-[#f8c017] hover:underline font-medium">
          Contact support
        </a>
      </div>
    </div>
  );
}

export default function VerifyMfaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    }>
      <VerifyMfaForm />
    </Suspense>
  );
}