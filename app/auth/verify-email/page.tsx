'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for a valid link.');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Email verified successfully! You can now sign in to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login?message=Email verified! You can now sign in.');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Email verification failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please check your connection.');
    }
  };

  const resendVerification = async () => {
    if (!email) {
      setMessage('Email address not found. Please register again.');
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(result.error || 'Failed to resend verification email.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-green-600" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-600" />;
      default:
        return <Mail className="w-12 h-12 text-blue-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying your email...';
      case 'success':
        return 'Email verified!';
      case 'error':
        return 'Verification failed';
      default:
        return 'Email verification';
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo for mobile */}
      <div className="text-center lg:hidden">
        <h1 className="text-3xl font-bold text-blue-600">SJFulfillment</h1>
        <p className="text-gray-600 mt-1">Your trusted logistics partner</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          {status === 'loading' && (
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={getVariant()}>
            <AlertDescription className="text-center">
              {message}
            </AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>Welcome to SJFulfillment! Your account is now active.</p>
              <p>Redirecting to login page...</p>
            </div>
          )}

          {status === 'error' && email && (
            <div className="text-center text-sm text-gray-600">
              <p>Need a new verification email?</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          {status === 'success' && (
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Continue to login
            </Button>
          )}

          {status === 'error' && email && (
            <Button
              onClick={resendVerification}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
          )}

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* Additional help */}
      <div className="text-center text-sm text-gray-500">
        Need help? Contact{' '}
        <a href="mailto:support@sjfulfillment.com" className="text-blue-600 hover:underline">
          support@sjfulfillment.com
        </a>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="text-center lg:hidden">
          <h1 className="text-3xl font-bold text-blue-600">SJFulfillment</h1>
          <p className="text-gray-600 mt-1">Your trusted logistics partner</p>
        </div>
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}