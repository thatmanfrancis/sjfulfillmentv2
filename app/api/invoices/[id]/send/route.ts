import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { sendMail } from "@/lib/nodemailer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while sending invoice` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: {
        customer: true,
        merchant: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Update invoice status
    await prisma.invoice.update({
      where: { id: id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Send email
    const invoiceUrl = `${process.env.NEXT_PUBLIC_URL}/invoices/${invoice.id}`;
    await sendMail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.merchant.businessName}`,
      html: `
        <h1>Invoice ${invoice.invoiceNumber}</h1>
        <p>Dear ${invoice.customer.firstName},</p>
        <p>Please find your invoice attached.</p>
        <p><strong>Amount Due:</strong> ${invoice.currencyId}${
        invoice.amountDue
      }</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
        <p><a href="${invoiceUrl}">View Invoice</a></p>
      `,
    });

    return NextResponse.json({
      message: "Invoice sent successfully",
    });
  } catch (error) {
    console.error("Send invoice error:", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
