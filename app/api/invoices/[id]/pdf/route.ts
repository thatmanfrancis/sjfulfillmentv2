import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PDFDocument from 'pdfkit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    // Get invoice with merchant data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        merchant: {
          select: {
            name: true,
            contactPhone: true,
            address: true,
            city: true,
            state: true,
            country: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Role-based access control
    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      if (invoice.merchantId !== authResult.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    
    return new Promise<NextResponse>((resolve) => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Create audit log
        await prisma.auditLog.create({
          data: {
            entityType: "Invoice",
            entityId: invoiceId,
            action: "INVOICE_PDF_GENERATED",
            details: {
              billingPeriod: invoice.billingPeriod,
              merchantName: invoice.merchant.name,
              totalDue: invoice.totalDue
            },
            changedById: authResult.user.id,
          },
        });

        resolve(new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${invoice.billingPeriod}.pdf"`
          }
        }));
      });

      // PDF Content
      doc.fontSize(20).text('SendJon 3PL Invoice', 50, 50);
      doc.fontSize(12);
      
      // Company header
      doc.text('SendJon Fulfillment Services', 350, 50);
      doc.text('Lagos, Nigeria', 350, 65);
      
      // Invoice details
      doc.text(`Invoice ID: ${invoice.id}`, 50, 120);
      doc.text(`Billing Period: ${invoice.billingPeriod}`, 50, 140);
      doc.text(`Issue Date: ${invoice.issueDate.toDateString()}`, 50, 160);
      doc.text(`Due Date: ${invoice.dueDate.toDateString()}`, 50, 180);
      doc.text(`Status: ${invoice.status}`, 50, 200);

      // Merchant details
      doc.text('Bill To:', 50, 240);
      doc.text(invoice.merchant.name, 50, 260);
      if (invoice.merchant.address) {
        doc.text(`${invoice.merchant.address}`, 50, 280);
      }
      if (invoice.merchant.city) {
        doc.text(`${invoice.merchant.city}, ${invoice.merchant.state}`, 50, 300);
      }
      if (invoice.merchant.contactPhone) {
        doc.text(`Phone: ${invoice.merchant.contactPhone}`, 50, 320);
      }

      // Charges breakdown
      doc.text('Charges Breakdown:', 50, 360);
      doc.text(`Storage Charges: ₦${invoice.storageCharges.toFixed(2)}`, 70, 380);
      doc.text(`Fulfillment Fees: ₦${invoice.fulfillmentFees.toFixed(2)}`, 70, 400);
      doc.text(`Receiving Fees: ₦${invoice.receivingFees.toFixed(2)}`, 70, 420);
      doc.text(`Other Fees: ₦${invoice.otherFees.toFixed(2)}`, 70, 440);
      
      // Total
      doc.fontSize(14)
         .text(`Total Amount Due: ₦${invoice.totalDue.toFixed(2)}`, 50, 480);
      
      if (invoice.amountPaid > 0) {
        doc.text(`Amount Paid: ₦${invoice.amountPaid.toFixed(2)}`, 50, 500);
        doc.text(`Balance Due: ₦${(invoice.totalDue - invoice.amountPaid).toFixed(2)}`, 50, 520);
      }

      // Payment terms
      doc.fontSize(10)
         .text('Payment Terms: Net 30 days', 50, 580)
         .text('Late payments may incur additional charges.', 50, 595);

      doc.end();
    });

  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}