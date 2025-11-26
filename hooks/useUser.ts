'use client';

import { useState, useEffect } from 'react';
import { get } from '@/lib/api';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'MERCHANT' | 'LOGISTICS';
  profileImage?: string;
  business?: {
    id: string;
    name: string;
    type: string;
  };
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get<{success: boolean; user: UserProfile} | UserProfile>('/api/auth/me');

     {console.log('This is users details response:', response)};
      
      // Handle both wrapped and unwrapped responses
      if ('user' in response && 'success' in response) {
        setUser(response.user);
      } else {
        setUser(response as UserProfile);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchUser();
  };

  return {
    user,
    loading,
    error,
    refetch
  };
}