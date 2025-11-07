import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while fetching previous remittances` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    const [remittances, total] = await Promise.all([
      prisma.remittance.findMany({
        where: { merchantId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          processor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.remittance.count({
        where: { merchantId: id },
      }),
    ]);

    return NextResponse.json({
      remittances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get remittances error:", error);
    return NextResponse.json(
      { error: "Failed to fetch remittances" },
      { status: 500 }
    );
  }
}
