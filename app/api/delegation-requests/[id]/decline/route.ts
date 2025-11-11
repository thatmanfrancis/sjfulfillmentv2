import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Authentication required` }, { status: 401 });
  }

  try {
    const { id } = await params;
    const requestRow = await prisma.delegationRequest.findUnique({ where: { id } });
    if (!requestRow) {
      return NextResponse.json({ error: "Delegation request not found" }, { status: 404 });
    }

    if (requestRow.toUserId !== String(auth.userId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (requestRow.status !== "PENDING") {
      return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
    }

    await prisma.delegationRequest.update({ where: { id }, data: { status: "DECLINED", respondedAt: new Date() } });

    // Notify original handler
    await prisma.notification.create({
      data: {
        userId: requestRow.fromUserId,
        type: "SYSTEM_ALERT",
        title: "Delegation declined",
        message: `Your delegation request ${requestRow.id} was declined`,
        data: { delegationRequestId: requestRow.id },
      },
    });

    return NextResponse.json({ message: "Delegation declined" });
  } catch (error) {
    console.error("Decline delegation error:", error);
    return NextResponse.json({ error: "Failed to decline delegation" }, { status: 500 });
  }
}
