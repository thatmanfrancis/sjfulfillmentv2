'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profileImage?: string;
  business?: {
    id: string;
    name: string;
    type: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        // No valid session, redirect to login
        handleLogout(false); // false = don't call API logout
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      handleLogout(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (callApi: boolean = true) => {
    if (callApi) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    // Clear all auth cookies
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    setUser(null);
    
    // Only redirect if we're not already on login page
    if (window.location.pathname !== '/auth/login') {
      router.push('/auth/login');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      logout: () => handleLogout(true),
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component to protect routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-brand-dark">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
        </div>
      );
    }

    if (!user) {
      return null; // Will redirect
    }

    return <Component {...props} />;
  };
}