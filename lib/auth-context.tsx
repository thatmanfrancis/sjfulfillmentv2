"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { type LoginResponse } from "@/schemas/loginSchema";
import { type UserRole } from "@/lib/rbac";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  merchantId?: string;
  warehouseId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkUser: typeof authClient.checkUser;
  login: typeof authClient.login;
  loginWithPassword: typeof authClient.loginWithPassword;
  requestOtp: typeof authClient.requestOtp;
  verifyOtp: typeof authClient.verifyOtp;
  verify2FA: typeof authClient.verify2FA;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]: any = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (authClient.isAuthenticated()) {
        const currentUser = await authClient.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Token invalid or expired, clear storage and redirect to login
          console.log("Token invalid or expired, clearing auth state");
          authClient.clearTokens();
          setUser(null);
          // Redirect to login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    } catch (error) {
      console.warn("Auth initialization failed:", error);
      authClient.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulAuth = (response: LoginResponse) => {
    if (response.accessToken && response.refreshToken) {
      // Store tokens in localStorage and cookies so middleware can read them server-side
      authClient.setTokensWithCookies(response.accessToken, response.refreshToken);
    }
    if (response.user) {
      setUser(response.user);
    }
  };

  const checkUser = async (data: Parameters<typeof authClient.checkUser>[0]) => {
    return await authClient.checkUser(data);
  };

  const login = async (data: Parameters<typeof authClient.login>[0]) => {
    const response = await authClient.login(data);
    
    // Handle different response types
    if (response.requiresOTP || response.requiresTwoFactor) {
      return response; // Return for further processing
    }
    
    handleSuccessfulAuth(response);
    return response;
  };

  const loginWithPassword = async (data: Parameters<typeof authClient.loginWithPassword>[0]) => {
    const response = await authClient.loginWithPassword(data);
    
    if (response.requiresTwoFactor) {
      return response; // Return for 2FA processing
    }
    
    handleSuccessfulAuth(response);
    return response;
  };

  const requestOtp = async (data: Parameters<typeof authClient.requestOtp>[0]) => {
    return await authClient.requestOtp(data);
  };

  const verifyOtp = async (data: Parameters<typeof authClient.verifyOtp>[0]) => {
    const response = await authClient.verifyOtp(data);
    
    if (response.requiresTwoFactor) {
      return response; // Return for 2FA processing
    }
    
    handleSuccessfulAuth(response);
    return response;
  };

  const verify2FA = async (data: Parameters<typeof authClient.verify2FA>[0]) => {
    const response = await authClient.verify2FA(data);
    handleSuccessfulAuth(response);
    return response;
  };

  const logout = async () => {
    try {
      await authClient.logout();
    } finally {
      setUser(null);
      // Clear any cached data and redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const refreshUser = async () => {
    try {
      if (!authClient.isAuthenticated()) {
        setUser(null);
        return;
      }
      
      const currentUser = await authClient.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Token expired or invalid
        console.log("Unable to refresh user, clearing auth state");
        authClient.clearTokens();
        setUser(null);
        // Redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.warn("Failed to refresh user:", error);
      authClient.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user,
    checkUser,
    login,
    loginWithPassword,
    requestOtp,
    verifyOtp,
    verify2FA,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Custom hook for protected pages
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login page
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  return { user, isLoading };
}