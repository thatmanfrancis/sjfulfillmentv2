import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");

    const skip = (page - 1) * limit;

    let where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action };
    if (userId) where.changedById = userId;

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get summary statistics
    const [actionCounts, entityCounts] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: true,
        orderBy: { _count: { entityType: 'desc' } },
      }),
    ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalLogs: total,
        topActions: Object.fromEntries(actionCounts.map(a => [a.action, a._count])),
        entityTypes: Object.fromEntries(entityCounts.map(e => [e.entityType, e._count])),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}