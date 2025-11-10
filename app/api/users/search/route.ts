import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can search users
  const ctx = await getUserMerchantContext(auth.userId as string);
  if (!ctx.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
