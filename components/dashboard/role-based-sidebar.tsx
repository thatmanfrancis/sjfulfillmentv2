'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { MerchantSidebar } from './merchant-sidebar';
import { LogisticsSidebar } from './logistics-sidebar';
import { MerchantStaffSidebar } from './merchant-staff-sidebar';
import { get } from '@/lib/api';

interface UserProfile {
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

export function RoleBasedSidebar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await get<{success: boolean; user: UserProfile} | UserProfile>('/api/auth/me');
      // Handle both wrapped and unwrapped responses
      if ('user' in response && 'success' in response) {
        setUser(response.user);
      } else {
        setUser(response as UserProfile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex items-center justify-center">
        <div className="text-sidebar-foreground">Loading...</div>
      </div>
    );
  }

  // Route to appropriate sidebar based on user role
  switch (user?.role) {
    case 'MERCHANT':
      return <MerchantSidebar />;
    case 'MERCHANT_STAFF':
      return <MerchantStaffSidebar />;
    case 'LOGISTICS':
      return <LogisticsSidebar />;
    case 'ADMIN':
    default:
      return <Sidebar />; // Admin sidebar for ADMIN and fallback
  }
}