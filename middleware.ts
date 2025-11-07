import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jose";

// Define protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/merchant",
  "/warehouse",
  "/orders",
  "/products",
  "/customers",
  "/reports",
  "/settings",
  "/profile",
];

// Define admin-only routes
const adminRoutes = [
  "/admin",
  "/admin/users",
  "/admin/commissions",
  "/admin/commision",
  "/admin/audit-logs",
];

// Define role-based route access
const roleRoutes = {
  ADMIN: [
    "/admin", 
    "/dashboard", 
    "/orders", 
    "/products", 
    "/customers", 
    "/merchants",
    "/warehouse",
    "/payments",
    "/returns", 
    "/shipments",
    "/categories",
    "/commissions",
    "/currencies",
    "/users",
    "/staff",
    "/call-logs",
    "/invoices",
    "/reports", 
    "/settings"
  ],
  MERCHANT: ["/merchant", "/dashboard", "/orders", "/products", "/customers", "/reports"],
  MERCHANT_STAFF: ["/merchant", "/orders", "/products", "/customers"],
  LOGISTICS_PERSONNEL: ["/dashboard", "/orders", "/shipments", "/delivery-attempts"],
  WAREHOUSE_MANAGER: ["/warehouse", "/dashboard", "/orders", "/inventory", "/products"],
};

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/verify-otp",
  "/api/auth/verify-2fa",
  "/api/auth/refresh-token",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname) || pathname === "/") {
    return NextResponse.next();
  }

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from Authorization header or cookies
  const authHeader = request.headers.get("Authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const tokenFromCookie = request.cookies.get("accessToken")?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    // Redirect to login for protected routes
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the JWT token
    const payload = await verifyJwt(token);

    if (!payload || !payload.userId) {
      throw new Error("Invalid token payload");
    }

    // Check role-based access
    const userRole = payload.role as keyof typeof roleRoutes;
    const allowedRoutes = roleRoutes[userRole];

    if (!allowedRoutes) {
      // Unknown role, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has access to this specific route
    const hasAccess = allowedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!hasAccess) {
      // User doesn't have access to this route
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", payload.role as string);
    response.headers.set("x-user-email", payload.email as string);

    return response;
  } catch (error) {
    console.error("Token verification failed:", error);

    // Invalid token, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session-expired");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};