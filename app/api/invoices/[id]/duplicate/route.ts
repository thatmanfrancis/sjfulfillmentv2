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
      { message: `Error occurred while duplicating invoice` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const original = await prisma.invoice.findUnique({
      where: { id: id },
      include: { items: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Generate new invoice number
    const invoiceCount = await prisma.invoice.count({
      where: { merchantId: original.merchantId },
    });
    const invoiceNumber = `INV-${original.merchantId
      .slice(0, 8)
      .toUpperCase()}-${String(invoiceCount + 1).padStart(6, "0")}`;

    const duplicate = await prisma.invoice.create({
      data: {
        merchantId: original.merchantId,
        invoiceNumber,
        invoiceType: original.invoiceType,
        customerId: original.customerId,
        billingAddressId: original.billingAddressId,
        currencyId: original.currencyId,
        subtotal: original.subtotal,
        taxAmount: original.taxAmount,
        discountAmount: original.discountAmount,
        totalAmount: original.totalAmount,
        amountDue: original.totalAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: original.paymentTerms,
        notes: original.notes,
        termsAndConditions: original.termsAndConditions,
        status: "DRAFT",
        createdBy: auth.userId as string,
        items: {
          create: original.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discountPercentage: item.discountPercentage,
            discountAmount: item.discountAmount,
            total: item.total,
          })),
        },
      },
    });

    return NextResponse.json({
      message: "Invoice duplicated successfully",
      invoice: duplicate,
    });
  } catch (error) {
    console.error("Duplicate invoice error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate invoice" },
      { status: 500 }
    );
  }
}
