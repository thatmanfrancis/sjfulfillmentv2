import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

// Route patterns that require authentication and role-based access
const PROTECTED_ROUTES = {
  admin: ['/admin'],
  merchant: ['/merchant'],
  logistics: ['/logistics']
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/set-password', '/unauthorized', '/', '/login', "/auth/forgot-pasword", "/auth/verify-mfa"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🔍 Proxy checking:', pathname);
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // files like .ico, .png, etc.
  ) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    console.log('✅ Public route, allowing access');
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie) {
    // No session token, redirect to login
    console.log('❌ No session token, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    let sessionData;
    let userRole;
    
    // Decrypt the JWT session token to get user data
    sessionData = await decrypt(sessionCookie.value);
    userRole = sessionData.role;
    console.log('👤 User role from session token:', userRole);
    
    if (!userRole) {
      console.log('❌ No user role found, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check role-based access
    for (const [role, routes] of Object.entries(PROTECTED_ROUTES)) {
      const matchesRoute = routes.some(route => pathname.startsWith(route));
      
      if (matchesRoute) {
        if (userRole !== role.toUpperCase()) {
          // User doesn't have access to this role's routes
          console.log(`❌ Access denied: ${userRole} trying to access ${pathname}`);
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        // User has correct role, allow access
        console.log(`✅ Access granted: ${userRole} accessing ${pathname}`);
        return NextResponse.next();
      }
    }

    // If accessing old /dashboard route, redirect to role-specific dashboard
    if (pathname === '/dashboard') {
      console.log('🔄 Redirecting from old /dashboard to role-specific dashboard');
      switch (userRole) {
        case 'ADMIN':
          console.log('👨‍💼 Redirecting ADMIN to /admin/dashboard');
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        case 'MERCHANT':
          console.log('🏪 Redirecting MERCHANT to /merchant/dashboard');
          return NextResponse.redirect(new URL('/merchant/dashboard', request.url));
        case 'LOGISTICS':
          console.log('🚚 Redirecting LOGISTICS to /logistics/dashboard');
          return NextResponse.redirect(new URL('/logistics/dashboard', request.url));
        default:
          console.log('❌ Unknown role, redirecting to auth login');
          return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }
    
    // If accessing root, redirect to role-specific dashboard
    if (pathname === '/') {
      console.log('🔄 Redirecting from root to role-specific dashboard');
      switch (userRole) {
        case 'ADMIN':
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        case 'MERCHANT':
          return NextResponse.redirect(new URL('/merchant/dashboard', request.url));
        case 'LOGISTICS':
          return NextResponse.redirect(new URL('/logistics/dashboard', request.url));
        default:
          return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }

    // Allow access to unmatched routes
    console.log('✅ Allowing access to unmatched route');
    return NextResponse.next();

  } catch (error) {
    console.error('❌ Error parsing session token:', error);
    // Invalid session, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};