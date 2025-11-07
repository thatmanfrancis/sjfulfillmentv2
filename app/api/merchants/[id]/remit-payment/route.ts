import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while remiting payment ` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { amount, paymentMethod, referenceNumber, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid remittance amount is required" },
        { status: 400 }
      );
    }

    // Get current balance
    const currentBalance = await prisma.merchantBalance.findUnique({
      where: { merchantId: id },
    });

    if (!currentBalance) {
      return NextResponse.json(
        { error: "Merchant balance not found" },
        { status: 404 }
      );
    }

    if (amount > currentBalance.pendingBalance) {
      return NextResponse.json(
        { error: "Remittance amount exceeds pending balance" },
        { status: 400 }
      );
    }

    // Create remittance record
    const remittance = await prisma.remittance.create({
      data: {
        merchantBalanceId: currentBalance.id,
        merchantId: id,
        amount,
        remittanceDate: new Date(),
        paymentMethod: paymentMethod || "BANK_TRANSFER",
        referenceNumber,
        notes,
        processedBy: auth.userId as string,
      },
    });

    // Update merchant balance
    const updatedBalance = await prisma.merchantBalance.update({
      where: { merchantId: id },
      data: {
        totalRemitted: { increment: amount },
        pendingBalance: { decrement: amount },
        lastRemittanceAt: new Date(),
      },
    });

    // Send notification
    const merchant = await prisma.merchant.findUnique({
      where: { id: id },
    });

    if (merchant) {
      const { sendNotification } = await import("@/lib/notifications");
      await sendNotification({
        userId: merchant.ownerUserId,
        merchantId: id,
        type: "PAYMENT_RECEIVED",
        title: "Payment Remitted",
        message: `Payment of ${amount} has been remitted. New pending balance: ${updatedBalance.pendingBalance}`,
        actionUrl: `/merchants/${id}/balance`,
        data: { remittanceId: remittance.id, amount },
      });
    }

    return NextResponse.json({
      message: "Payment remitted successfully",
      remittance,
      balance: updatedBalance,
    });
  } catch (error) {
    console.error("Remit payment error:", error);
    return NextResponse.json(
      { error: "Failed to remit payment" },
      { status: 500 }
    );
  }
}
