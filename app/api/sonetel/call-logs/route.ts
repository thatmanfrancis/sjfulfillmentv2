import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // Extract user from session cookie (JWT)
    const sessionToken = req.cookies.get("session")?.value;
    let userId = null;
    let userRole = null;
    if (sessionToken) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
        const session = jwt.verify(sessionToken, JWT_SECRET) as any;
        userId = session.userId;
        userRole = session.role;
      } catch (e) {}
    }

    // Query params for filtering/pagination
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("limit") || "20", 10);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const mine = searchParams.get("mine") === "true";

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (mine && userId) where.userId = userId;

    const [total, logs] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          User: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch call logs",
      },
      { status: 500 }
    );
  }
}
