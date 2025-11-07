import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while attempting delivery` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      handlerId: auth.userId as string,
    };

    if (status) {
      where.status = status;
    }

    const attempts = await prisma.deliveryAttempt.findMany({
      where,
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
          },
        },
      },
      orderBy: { eta: "asc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Get assigned deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assigned deliveries" },
      { status: 500 }
    );
  }
}
