import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jose";

// Mirror of middleware logic but exported as `proxy` to satisfy Next.js newer convention
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
    "/admin/commissions",
    "/admin/logistics",
    "/currencies",
    "/users",
    "/staff",
    "/call-logs",
    "/invoices",
    "/reports",
    "/settings",
  ],
  MERCHANT: ["/merchant", "/dashboard", "/orders", "/products", "/customers", "/reports"],
  MERCHANT_STAFF: ["/merchant", "/orders", "/products", "/customers"],
  LOGISTICS_PERSONNEL: ["/dashboard", "/orders", "/shipments", "/delivery-attempts", "/logistics"],
  WAREHOUSE_MANAGER: ["/warehouse", "/dashboard", "/orders", "/inventory", "/products"],
};

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/resend-verification",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/verify-otp",
  "/api/auth/verify-2fa",
  "/api/auth/refresh-token",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect common misspelling '/admin/commisions' -> '/admin/commissions'
  if (pathname.startsWith("/admin/commisions")) {
    const correct = new URL(pathname.replace("/admin/commisions", "/admin/commissions"), request.url);
    return NextResponse.redirect(correct);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))
  ) {
    return NextResponse.next();
  }

  if (publicRoutes.includes(pathname) || pathname === "/") return NextResponse.next();

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtectedRoute) return NextResponse.next();

  const authHeader = request.headers.get("Authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const tokenFromCookie = request.cookies.get("accessToken")?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) throw new Error("Invalid token payload");

    if (payload.role === "ADMIN" && pathname.startsWith("/admin")) {
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.userId as string);
      response.headers.set("x-user-role", payload.role as string);
      response.headers.set("x-user-email", (payload as any).email as string);
      return response;
    }

    const userRole = payload.role as keyof typeof roleRoutes;
    const allowedRoutes = roleRoutes[userRole];
    if (!allowedRoutes) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));
    if (!hasAccess) {
      console.warn("Proxy access denied", { pathname, userRole, allowedRoutes });
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", payload.role as string);
    response.headers.set("x-user-email", payload.email as string);
    return response;
  } catch (error) {
    console.error("Token verification failed:", error);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session-expired");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
