'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(
          'If an account with this email exists, you will receive a password reset link shortly.'
        );
        setEmail('');
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

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
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-[#f8c017]/10 border border-[#f8c017]/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-[#f8c017]" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-[#f8c017]/30 bg-[#f8c017]/5">
                <Mail className="h-4 w-4 text-[#f8c017]" />
                <AlertDescription className="text-gray-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {!success && (
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full border border-[#f08c17]"
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-6 pt-6">
            {!success ? (
              <>
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800  border-2 text-white hover:border-[#f8c017] transition-all duration-200"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center text-sm text-[#f8c017] hover:underline font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to login
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-4 w-full">
                <div className="text-center text-sm text-gray-600 space-y-2">
                  <p>Check your email and follow the instructions to reset your password.</p>
                  <p>Didn't receive an email? Check your spam folder or try again.</p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccess('');
                    setEmail('');
                  }}
                  disabled={isLoading}
                >
                  Send another email
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center text-sm text-[#f8c017] hover:underline font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to login
                  </Link>
                </div>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Additional help */}
      <div className="text-center text-sm text-gray-500">
        Need immediate help? Contact{' '}
        <a href="mailto:support@sjfulfillment.com" className="text-[#f8c017] hover:underline font-medium">
          support@sjfulfillment.com
        </a>
      </div>
    </div>
  );
}