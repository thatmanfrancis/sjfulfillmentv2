'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';
import AdminDashboard from '../admin/page';
import MerchantDashboard from '../merchant/page';
import LogisticsDashboard from '../logistics/page';
import MerchantStaffDashboard from '../staff/page';

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const session = await getCurrentSession();
        if (session) {
          setUserRole(session.role);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Failed to fetch user session:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (userRole) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MERCHANT':
      return <MerchantDashboard />;
    case 'LOGISTICS':
      return <LogisticsDashboard />;
    case 'MERCHANT_STAFF':
      return <MerchantStaffDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this dashboard.</p>
          </div>
        </div>
      );
  }
}