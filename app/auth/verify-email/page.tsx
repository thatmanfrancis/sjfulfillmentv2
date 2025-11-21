'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_verified' | 'password_setup'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');


  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR safety
    if (email) {
      setUserEmail(email);
    }
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for a valid link.');
      return;
    }
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
        setDebugInfo({
          status: response.status,
          ok: response.ok,
          result,
          token,
          email,
        });
        if (response.ok) {
          setStatus(result.requiresPasswordSetup ? 'password_setup' : 'success');
          if (result.requiresPasswordSetup) {
            setMessage('Email verified successfully! Please set your password to continue.');
          } else {
            setMessage('Email verified successfully! You can now sign in to your account.');
            setTimeout(() => {
              router.replace('/auth/login?message=Email verified! You can now sign in.');
            }, 2000);
          }
        } else {
          // Check for specific error types
          if (result.error?.includes('already verified')) {
            setStatus('already_verified');
            setMessage('Your email is already verified! You can proceed to login.');
          } else if (result.error?.includes('expired')) {
            setStatus('error');
            setMessage('Verification link has expired. Please request a new verification email.');
          } else if (result.error?.includes('already been used')) {
            setStatus('already_verified');
            setMessage('This verification link has already been used. If your email is verified, you can login. Otherwise, request a new verification email.');
          } else {
            setStatus('error');
            setMessage(result.error || 'Email verification failed. Please try again.');
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
        setDebugInfo({ error: String(error), token, email });
      }
    };
    verifyEmail();
  }, [token, email, router]);

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
        
        // Check if password setup is required
        if (result.requiresPasswordSetup) {
          setMessage('Email verified successfully! Please set your password to continue.');
          // Redirect to set-password after 2 seconds, passing token and email if available
          setTimeout(() => {
            const params = [];
            if (token) params.push(`token=${encodeURIComponent(token)}`);
            if (email) params.push(`email=${encodeURIComponent(email)}`);
            const query = params.length ? `?${params.join('&')}` : '';
            router.push(`/auth/set-password${query}`);
          }, 2000);
        } else {
          setMessage('Email verified successfully! You can now sign in to your account.');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth/login?message=Email verified! You can now sign in.');
          }, 3000);
        }
      } else {
        // Check for specific error types
        if (result.error?.includes('already verified')) {
          setStatus('already_verified');
          setMessage('Your email is already verified! You can proceed to login.');
        } else if (result.error?.includes('expired')) {
          setStatus('error');
          setMessage('Verification link has expired. Please request a new verification email.');
        } else if (result.error?.includes('already been used')) {
          setStatus('already_verified');
          setMessage('This verification link has already been used. If your email is verified, you can login. Otherwise, request a new verification email.');
        } else {
          setStatus('error');
          setMessage(result.error || 'Email verification failed. Please try again.');
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const resendVerification = async () => {
    const emailToUse = userEmail || email;
    
    if (!emailToUse) {
      setMessage('Email address not found. Please register again or contact support.');
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToUse }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('New verification email sent! Please check your inbox and spam folder.');
        setStatus('loading'); // Reset to loading state for better UX
      } else {
        if (result.error?.includes('already verified')) {
          setStatus('already_verified');
          setMessage('Your email is already verified! You can proceed to login.');
        } else {
          setMessage(result.error || 'Failed to resend verification email. Please try again.');
        }
      }
    } catch (error) {
      setMessage('Network error. Please try again later.');
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
      case 'already_verified':
        return <CheckCircle2 className="w-12 h-12 text-blue-600" />;
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
      case 'already_verified':
        return 'Already verified';
      case 'error':
        return 'Verification failed';
      default:
        return 'Email verification';
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'success':
      case 'already_verified':
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

          {status === 'password_setup' && (
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>Your email is verified! Please set your password to continue.</p>
              <Button
                className="w-full"
                onClick={() => {
                  const params = [];
                  if (token) params.push(`token=${encodeURIComponent(token)}`);
                  if (email) params.push(`email=${encodeURIComponent(email)}`);
                  const query = params.length ? `?${params.join('&')}` : '';
                  router.push(`/auth/set-password${query}`);
                }}
              >
                Setup Password
              </Button>
            </div>
          )}

          {status === 'already_verified' && (
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>Your account is ready to use!</p>
              <p>You can now sign in to access your dashboard.</p>
            </div>
          )}

          {status === 'error' && (userEmail || email) && (
            <div className="text-center text-sm text-gray-600">
              <p>Need a new verification email?</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          {(status === 'success' || status === 'already_verified') && (
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Continue to login
            </Button>
          )}

          {status === 'error' && (userEmail || email) && (
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
                'Request new verification email'
              )}
            </Button>
          )}

          {status === 'error' && !(userEmail || email) && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don't have an account yet?
              </p>
              <Button
                onClick={() => router.push('/auth/register')}
                variant="outline"
                className="w-full"
              >
                Create account
              </Button>
            </div>
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