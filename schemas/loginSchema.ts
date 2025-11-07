import { z } from "zod";

// Base email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

// Email check schema (first step)
export const emailCheckSchema = z.object({
  email: emailSchema,
});

// Password login schema
export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

// OTP login schema (email only to request OTP)
export const otpRequestSchema = z.object({
  email: emailSchema,
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .min(1, "OTP is required")
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

// 2FA verification schema
export const twoFactorSchema = z.object({
  tempToken: z.string().min(1, "Temporary token is required"),
  code: z
    .string()
    .min(1, "2FA code is required")
    .length(6, "2FA code must be exactly 6 digits")
    .regex(/^\d{6}$/, "2FA code must contain only numbers"),
});

// Combined login schema for initial login attempt
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().optional(), // Optional for OTP-only users
});

// Type exports for TypeScript
export type EmailCheckData = z.infer<typeof emailCheckSchema>;
export type PasswordLoginData = z.infer<typeof passwordLoginSchema>;
export type OtpRequestData = z.infer<typeof otpRequestSchema>;
export type OtpVerificationData = z.infer<typeof otpVerificationSchema>;
export type TwoFactorData = z.infer<typeof twoFactorSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// User check response type
export interface UserCheckResponse {
  exists: boolean;
  firstName?: string;
  preferredAuthMethod?: "PASSWORD" | "OTP" | "BOTH";
  message?: string;
}

// Login response types (for frontend state management)
export interface LoginResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
  requiresOTP?: boolean;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  otp?: string; // Only for development/testing
}

// Error response type
export interface LoginError {
  error: string;
}