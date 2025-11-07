"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { checkRouteAccess } from '@/lib/rbac';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check access during loading
    if (loading) return;
    
    // Public routes that don't require authentication
    const publicRoutes = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/resend-verification',
      '/unauthorized'
    ];
    
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    
    // If user is authenticated and trying to access login/register, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
      router.push('/dashboard');
      return;
    }
    
    // If it's a public route and user is not authenticated, allow access
    if (isPublicRoute && !user) {
      return;
    }
    
    // If not authenticated and not on a public route, redirect to login
    if (!user && !isPublicRoute) {
      router.push('/login');
      return;
    }
    
    // If authenticated, check if user has access to this route
    if (user && !isPublicRoute) {
      const hasAccess = checkRouteAccess(user.role as any, pathname);
      
      if (!hasAccess) {
        console.log(`Access denied for role ${user.role} to path ${pathname}`);
        // Redirect to unauthorized page
        router.push('/unauthorized');
        return;
      }
    }
    
  }, [user, loading, pathname, router]);

  // Show loading spinner during authentication check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#f08c17]"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/resend-verification',
    '/unauthorized'
  ];
  
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // If authenticated user tries to access login/register, show nothing (redirect will happen)
  if (user && (pathname === '/login' || pathname === '/register')) {
    return null;
  }
  
  // If not authenticated and not on public route, show nothing (redirect will happen)
  if (!user && !isPublicRoute) {
    return null;
  }
  
  // If authenticated but no access to current route, show nothing (redirect will happen)
  if (user && !isPublicRoute && !checkRouteAccess(user.role as any, pathname)) {
    return null;
  }

  return <>{children}</>;
}