'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { get } from '@/lib/api';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export function RoleGuard({ allowedRoles, children, fallbackPath = '/dashboard' }: RoleGuardProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const response = await get<{success: boolean; user: UserProfile} | UserProfile>('/api/auth/me');
      let userData: UserProfile;
      
      if ('user' in response && 'success' in response) {
        userData = response.user;
      } else {
        userData = response as UserProfile;
      }
      
      setUser(userData);
      
      // Check if user role is allowed
      if (!allowedRoles.includes(userData.role)) {
        router.replace(fallbackPath);
        return;
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null; // Will redirect
  }

  return <>{children}</>;
}