"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import {
  emailCheckSchema,
  passwordLoginSchema,
  otpVerificationSchema,
  twoFactorSchema,
  type UserCheckResponse,
} from "@/schemas/loginSchema";

type LoginStep = "email" | "password" | "otp" | "2fa" | "success";

// Modern 6-box OTP Input Component
interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

function OTPInput({ value, onChange, disabled = false, autoFocus = false }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, inputValue: string) => {
    if (inputValue.length > 1) {
      // Handle paste - take only numbers and fill from current position
      const numbers = inputValue.replace(/\D/g, '');
      const newValue = value.split('');
      
      for (let i = 0; i < numbers.length && index + i < 6; i++) {
        newValue[index + i] = numbers[i];
      }
      
      const finalValue = newValue.join('').slice(0, 6);
      onChange(finalValue);
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + numbers.length, 5);
      setTimeout(() => inputRefs.current[nextIndex]?.focus(), 0);
      return;
    }

    // Handle single character input
    if (/^\d?$/.test(inputValue)) {
      const newValue = value.split('');
      newValue[index] = inputValue;
      onChange(newValue.join(''));

      // Auto-focus next input if digit was entered
      if (inputValue && index < 5) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      const newValue = value.split('');
      
      if (newValue[index]) {
        // Clear current input
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
      }
    }
    // Handle arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center space-x-2 sm:space-x-3">
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={(el: any) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-semibold border border-gray-600 bg-black text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f08c17] focus:border-[#f08c17] transition-all"
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [userInfo, setUserInfo] = useState<UserCheckResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const { user, checkUser, loginWithPassword, requestOtp, verifyOtp, verify2FA } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      router.push(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  // Step 1: Check if user exists and get auth method
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const validatedData = emailCheckSchema.parse({ email });
      const response = await checkUser(validatedData);
      
      setUserInfo(response);
      
      // Determine next step based on user's preferred auth method
      if (response.preferredAuthMethod === "PASSWORD" || response.preferredAuthMethod === "BOTH") {
        setStep("password");
      } else if (response.preferredAuthMethod === "OTP") {
        // Automatically send OTP
        await handleSendOtp();
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify email");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2a: Handle password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const validatedData = passwordLoginSchema.parse({ email, password });
      const response = await loginWithPassword(validatedData);

      if (response.requiresTwoFactor) {
        setTempToken(response.tempToken!);
        setStep("2fa");
      } else {
        // Success
        setStep("success");
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2b: Send OTP (for OTP-only users)
  const handleSendOtp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await requestOtp({ email });
      if (response.requiresOTP) {
        setStep("otp");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Handle OTP verification
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const validatedData = otpVerificationSchema.parse({ email, otp });
      const response = await verifyOtp(validatedData);

      if (response.requiresTwoFactor) {
        setTempToken(response.tempToken!);
        setStep("2fa");
      } else {
        // Success
        setStep("success");
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Handle 2FA verification
  const handle2FAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const validatedData = twoFactorSchema.parse({
        tempToken,
        code: twoFactorCode,
      });
      await verify2FA(validatedData);

      // Success
      setStep("success");
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || "2FA verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === "password" || step === "otp") {
      setStep("email");
      setUserInfo(null);
      setPassword("");
      setOtp("");
    } else if (step === "2fa") {
      if (userInfo?.preferredAuthMethod === "PASSWORD" || userInfo?.preferredAuthMethod === "BOTH") {
        setStep("password");
      } else {
        setStep("otp");
      }
      setTwoFactorCode("");
      setTempToken("");
    }
    setError("");
  };

  // Handle switch to OTP for users with BOTH auth methods
  const handleSwitchToOtp = async () => {
    setError("");
    setPassword("");
    await handleSendOtp();
  };

  // Don't show login form if user is already authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              className="mx-auto h-16 w-auto"
              src="/sjf.png"
              alt="SJFulfillment"
            />
            <h2 className="mt-6 text-3xl font-extrabold text-green-400">Already Logged In</h2>
            <p className="mt-2 text-sm text-gray-400">Redirecting to your dashboard...</p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08c17] mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              className="mx-auto h-16 w-auto"
              src="/sjf.png"
              alt="SJFulfillment"
            />
            <h2 className="mt-6 text-3xl font-extrabold text-green-400">Login Successful!</h2>
            <p className="mt-2 text-sm text-gray-400">Redirecting to your dashboard...</p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08c17] mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <img
            className="mx-auto h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            src="/sjf.png"
            alt="SJFulfillment"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {step === "email" && "Welcome Back"}
            {step === "password" && `Welcome, ${userInfo?.firstName || "User"}!`}
            {step === "otp" && "Check Your Email"}
            {step === "2fa" && "Two-Factor Authentication"}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {step === "email" && "Enter your email address to continue"}
            {step === "password" && "Enter your password to complete sign in"}
            {step === "otp" && `We've sent a 6-digit code to ${email}`}
            {step === "2fa" && "Enter your 2FA code from your authenticator app"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-900/50 border border-red-700 p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">Error</h3>
                <div className="mt-2 text-sm text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6">
          {/* Email Step */}
          {step === "email" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full px-3 py-3 border border-gray-600 placeholder-gray-400 text-white bg-black rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f08c17] focus:border-[#f08c17] sm:text-sm"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={handleEmailSubmit}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-black bg-[#f08c17] hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f08c17] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </div>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex items-center justify-between text-sm">
                <a
                  href="/forgot-password"
                  className="font-medium text-[#f08c17] hover:text-orange-500 transition-colors"
                >
                  Forgot password?
                </a>
                <a
                  href="/resend-verification"
                  className="font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Resend verification
                </a>
              </div>
              <div className="text-center text-gray-400 text-xs">
                New to SJFulfillment? Contact admin for account creation
              </div>
            </div>
          )}

          {/* Password Step */}
          {step === "password" && (
            <div className="space-y-4">
              {/* Email Display */}
              <div className="text-sm text-gray-300 bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2">
                {email}
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full px-3 py-3 border border-gray-600 placeholder-gray-400 text-white bg-black rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f08c17] focus:border-[#f08c17] sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-1/3 border border-gray-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-gray-300 hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={handlePasswordLogin}
                  className="w-2/3 bg-[#f08c17] hover:bg-orange-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>
              </div>

              {userInfo?.preferredAuthMethod === "BOTH" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSwitchToOtp}
                    className="text-sm text-[#f08c17] hover:text-orange-300 transition-colors"
                    disabled={isLoading}
                  >
                    Use OTP instead
                  </button>
                </div>
              )}

              {/* Additional Auth Links */}
              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="text-sm text-[#f08c17] hover:text-orange-500 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            </div>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 text-center mb-4">
                  Enter the 6-digit code sent to your email
                </label>
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  autoFocus={true}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-1/3 border border-gray-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-gray-300 hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  onClick={handleOtpVerification}
                  className="w-2/3 bg-[#f08c17] hover:bg-orange-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-sm text-[#f08c17] hover:text-orange-500 transition-colors"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>

              {/* Additional Help Links */}
              <div className="text-center">
                <a
                  href="/resend-verification"
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Having trouble? Resend verification email
                </a>
              </div>
            </div>
          )}

          {/* 2FA Step */}
          {step === "2fa" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 text-center mb-4">
                  Enter your 2FA authentication code
                </label>
                <OTPInput
                  value={twoFactorCode}
                  onChange={setTwoFactorCode}
                  disabled={isLoading}
                  autoFocus={true}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-1/3 border border-gray-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-gray-300 hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length !== 6}
                  onClick={handle2FAVerification}
                  className="w-2/3 bg-[#f08c17] hover:bg-orange-500 transition-all duration-300 ease-in-out font-semibold hover:cursor-pointer rounded-lg h-10 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify 2FA"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}