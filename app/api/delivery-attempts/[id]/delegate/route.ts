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
    const body = await req.json();
    const { toUserId } = body;

    if (!toUserId) {
      return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
    }

    const attempt = await prisma.deliveryAttempt.findUnique({ where: { id } });
    if (!attempt) {
      return NextResponse.json({ error: "Delivery attempt not found" }, { status: 404 });
    }

    // Only current handler or admin can create delegation
    const userIdStr = String(auth.userId);
    const isAdmin = await (async () => {
      try {
        const roleRes = await prisma.user.findUnique({ where: { id: userIdStr } });
        return roleRes?.role === "ADMIN";
      } catch (e) {
        return false;
      }
    })();

    if (!isAdmin && attempt.handlerId !== auth.userId) {
      return NextResponse.json({ error: "Not authorized to delegate this attempt" }, { status: 403 });
    }

    // Ensure toUser exists and is logistics personnel
    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser || toUser.role !== "LOGISTICS_PERSONNEL") {
      return NextResponse.json({ error: "Target user is not logistics personnel" }, { status: 400 });
    }

    // Create delegation request
    const reqRow = await prisma.delegationRequest.create({
      data: {
        deliveryAttemptId: id,
        fromUserId: auth.userId as string,
        toUserId,
        status: "PENDING",
      },
    });

    // Notify the target user (in-app)
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: "SYSTEM_ALERT",
        title: "Delegation request",
        message: `You have a delegation request for delivery attempt ${id}`,
        data: { deliveryAttemptId: id, delegationRequestId: reqRow.id },
      },
    });

    return NextResponse.json({ message: "Delegation requested", request: reqRow });
  } catch (error) {
    console.error("Create delegation request error:", error);
    return NextResponse.json({ error: "Failed to create delegation request" }, { status: 500 });
  }
}
