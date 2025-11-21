'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { get } from '@/lib/api';
import { canAccessRoute, getRouteConfig, getRoleBasedDashboard } from '@/lib/route-config';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAccess();
  }, [pathname]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      
      const response: any = await get('/api/auth/me');
      const role = response?.user?.role || response?.role;
      setUserRole(role);
      
      // Check if user can access current route
      if (!canAccessRoute(role, pathname)) {
        setAccessDenied(true);
        // Redirect to appropriate dashboard after a short delay
        setTimeout(() => {
          const dashboardRoute = getRoleBasedDashboard(role);
          router.push(dashboardRoute);
        }, 2000);
        return;
      }
      
    } catch (error) {
      console.error('Failed to check user access:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white">Checking access...</div>
      </div>
    );
  }

  if (accessDenied) {
    const routeConfig = getRouteConfig(pathname);
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Your role ({userRole}) does not have permission to access this page.
          </p>
          {routeConfig && (
            <p className="text-sm text-red-500 mb-4">
              Required roles: {routeConfig.allowedRoles.join(', ')}
            </p>
          )}
          <p className="text-sm text-gray-600">
            Redirecting to dashboard in a moment...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}