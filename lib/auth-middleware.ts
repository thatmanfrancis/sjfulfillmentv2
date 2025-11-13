import { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jose";

export async function getCurrentUser(req: NextRequest) {
  try {
  const authHeader = req.headers.get("Authorization");

    // Support Authorization header or accessToken cookie
    let token: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Support a "remember" token header (e.g. x-remember-token) for long-lived sessions
      const rememberHeader = req.headers.get("x-remember-token") || req.headers.get("remember-token") || req.headers.get("rememberToken");
      if (rememberHeader) {
        token = rememberHeader;
      } else {
      // Try cookie (server-side requests may use cookies)
      try {
        const cookieToken = (req as any).cookies?.get?.("accessToken")?.value ?? null;
        if (cookieToken) {
          token = cookieToken;
          console.log("Token read from cookie, length:", token?.length);
        }
      } catch (e) {
        // ignore cookie parsing errors
      }
      }
    }

    if (!token) {
      return null;
    }

  const payload = await verifyJwt(token);

    if (!payload || !payload.userId) {
      console.log("No valid payload or userId");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user || !user.userId) {
      console.log("Auth failed: No user or userId", { user });
      return {
        error: "Unauthorized - Invalid or expired token",
        status: 401,
      };
    }

    return user;
  } catch (error) {
    console.error("requireAuth error:", error);
    return {
      error: "Authentication failed",
      status: 401,
    };
  }
}
