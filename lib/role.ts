import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import prisma from "@/lib/prisma";

export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const auth = await requireAuth(req);
  
  if ("error" in auth) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  // Get user with role
  const user = await prisma.user.findUnique({
    where: { id: auth.userId as string },
    select: { id: true, role: true },
  });

  if (!user) {
    return {
      error: "User not found",
      status: 404,
    };
  }

  const hasRole = allowedRoles.includes(user.role);

  if (!hasRole) {
    return {
      error: "Forbidden - Insufficient permissions",
      status: 403,
    };
  }

  return { user: { ...auth, role: user.role } };
}
