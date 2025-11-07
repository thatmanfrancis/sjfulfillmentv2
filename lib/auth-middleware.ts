import { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/jose";

export async function getCurrentUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid auth header");
      return null;
    }
    
    const token = authHeader.substring(7);
    console.log("Token extracted, length:", token.length);
    
    const payload = await verifyJwt(token);
    console.log("JWT payload:", payload ? "Valid" : "Invalid");

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
