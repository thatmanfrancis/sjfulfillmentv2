"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    console.log('VerifyEmailContent mounted, token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (token) {
      verifyEmail(token);
    } else {
      console.log('No token found in URL params');
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  // Debug helper: expose a manual trigger and the token so we can test in browsers
  const debugTrigger = async () => {
    if (!token) {
      setMessage('No token available to test');
      return;
    }
    console.log('Manual debug trigger clicked');
    await verifyEmail(token);
  };

  const verifyEmail = async (verificationToken: string) => {
    console.log('=== FRONTEND: Starting verification ===');
    console.log('Token (first 50 chars):', verificationToken.substring(0, 50) + '...');
    
    try {
      console.log('Making POST request to /api/auth/verify-email');
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      console.log('Response received - Status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        console.log('Verification successful!');
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now log in to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          console.log('Redirecting to login...');
          router.push('/login');
        }, 3000);
      } else {
        console.log('Verification failed:', data);
        setStatus('error');
        setMessage(data.message || data.error || 'Email verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your email');
    }
  };

  const resendVerification = async () => {
    if (!token) return;
    
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      setMessage('An error occurred while resending verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Image
            className="mx-auto h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            src="/sjf.png"
            alt="SJFulfillment"
            width={64}
            height={64}
            onClick={() => router.push('/login')}
          />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Email Verification
          </h2>
        </div>

        {/* Content */}
        <div className="bg-black border border-gray-700 rounded-lg p-6">
          {/* DEBUG: show token and manual trigger for situations where automatic run fails */}
          <div className="mb-4 text-sm text-gray-400">
            <div>Debug token: <code className="text-xs text-orange-300">{token ? token.substring(0, 120) + (token.length > 120 ? '...' : '') : 'N/A'}</code></div>
            <div className="mt-2">
              <button onClick={debugTrigger} className="bg-gray-800 hover:bg-gray-700 text-sm text-white px-3 py-1 rounded">Trigger verification (debug)</button>
            </div>
          </div>
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17] mx-auto mb-4"></div>
              <p className="text-gray-300">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-900/30 p-3 rounded-full">
                  <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-300 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-[#f08c17] hover:bg-orange-500 text-black font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Login
                </button>
                <p className="text-sm text-gray-400">
                  Redirecting to login page in 3 seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-900/30 p-3 rounded-full">
                  <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-300 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                {token && (
                  <button
                    onClick={resendVerification}
                    disabled={isResending}
                    className="w-full bg-[#f08c17] hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isResending ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                )}
                <button
                  onClick={() => router.push('/login')}
                  className="w-full border border-gray-500 hover:bg-gray-800 text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Having trouble with email verification?{' '}
            <a 
              href="/resend-verification" 
              className="text-[#f08c17] hover:text-orange-500 transition-colors"
            >
              Request a new verification email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17]"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}