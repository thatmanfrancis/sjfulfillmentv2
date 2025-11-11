import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });

  try {
    const requests = await prisma.delegationRequest.findMany({
      where: { toUserId: String(auth.userId), status: "PENDING" },
      include: {
        deliveryAttempt: { include: { order: { include: { customer: true, shippingAddress: true } } } },
        fromUser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get delegation requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch delegation requests' }, { status: 500 });
  }
}
