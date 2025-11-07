import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching customer payments` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          currency: {
            select: {
              code: true,
              symbol: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
      }),
      prisma.payment.count({ where: { customerId: id } }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customer payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer payments" },
      { status: 500 }
    );
  }
}
