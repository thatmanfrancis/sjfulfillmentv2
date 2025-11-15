import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/orders',
  '/products',
  '/warehouses',
  '/inventory',
  '/analytics',
  '/invoices',
  '/settings',
  '/admin',
  '/shipments',
  '/customers',
  '/notifications',
  '/reports',
  '/staff',
  '/logistics',
  '/merchant'
];

// Define auth routes
const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email'
];

// Define public routes
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/pricing'
];

// Admin-only routes
const adminRoutes = [
  '/admin'
];

// Define role-based route access
const roleRoutes = {
  ADMIN: protectedRoutes, // Admin has access to all protected routes
  MERCHANT: ['/dashboard', '/orders', '/products', '/inventory', '/invoices', '/warehouses', '/customers', '/analytics'],
  MERCHANT_STAFF: ['/dashboard', '/orders', '/products', '/inventory'],
  LOGISTICS: ['/orders', '/shipments', '/dashboard', '/warehouses']
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;

  // Allow API routes to pass through
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public assets to pass through
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/icons/')) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
  
  // Check if route is auth-related
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If it's a public route, allow access
  if (isPublicRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  // If no token exists
  if (!token) {
    // Redirect to login if trying to access protected route
    if (isProtectedRoute) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Allow access to auth routes
    if (isAuthRoute) {
      return NextResponse.next();
    }
    
    // For other routes without token, redirect to login
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // If token exists, verify it
  if (token) {
    try {
      const payload = await decrypt(token);
      
      // If user is authenticated but trying to access auth pages, redirect to dashboard
      if (isAuthRoute && payload) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Check role-based access for protected routes
      if (isProtectedRoute && payload) {
        // Admin users have access to all protected routes
        if (payload.role === 'ADMIN') {
          const response = NextResponse.next();
          response.headers.set('x-user-id', payload.userId);
          response.headers.set('x-user-role', payload.role);
          response.headers.set('x-user-business-id', payload.businessId || '');
          return response;
        }

        // Check if non-admin user has access to admin routes
        if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Check role-based access for non-admin users
        const userAllowedRoutes = roleRoutes[payload.role as keyof typeof roleRoutes] || [];
        const hasAccess = userAllowedRoutes.some(route => pathname.startsWith(route)) || 
                         pathname === '/dashboard'; // Dashboard is accessible to all authenticated users

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Add user info to headers for API routes
        const response = NextResponse.next();
        response.headers.set('x-user-id', payload.userId);
        response.headers.set('x-user-role', payload.role);
        response.headers.set('x-user-business-id', payload.businessId || '');
        return response;
      }

      return NextResponse.next();
    } catch (error) {
      // Invalid token, clear it and redirect to login
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  return NextResponse.next();
}

// Configure matcher to run proxy on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
