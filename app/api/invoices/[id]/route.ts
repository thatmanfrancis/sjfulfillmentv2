import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "PAID", "OVERDUE"]).optional(),
  dueDate: z.string().datetime().optional(),
  totalDue: z.number().positive().optional(),
  storageCharges: z.number().min(0).optional(),
  fulfillmentFees: z.number().min(0).optional(),
  receivingFees: z.number().min(0).optional(),
  otherFees: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
            contactPhone: true,
            address: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (authResult.user.role !== "ADMIN" && invoice.merchantId !== authResult.user.businessId) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        outstandingAmount: invoice.totalDue - invoice.amountPaid,
        isOverdue: invoice.status === 'OVERDUE' || (invoice.status === 'ISSUED' && invoice.dueDate < new Date()),
        daysPastDue: invoice.dueDate < new Date() 
          ? Math.ceil((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 3600 * 24))
          : 0,
        isPaid: invoice.amountPaid >= invoice.totalDue,
        paymentProgress: invoice.totalDue > 0 ? (invoice.amountPaid / invoice.totalDue) * 100 : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateInvoiceSchema.parse(body);

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Auto-update status based on payment
    let updateData: any = { ...validatedData };
    
    if (validatedData.amountPaid !== undefined) {
      const newAmountPaid = validatedData.amountPaid;
      const totalDue = validatedData.totalDue || existingInvoice.totalDue;
      
      if (newAmountPaid >= totalDue) {
        updateData.status = "PAID";
      } else if (newAmountPaid > 0) {
        updateData.status = "ISSUED";
      }
    }

    // Convert date string if provided
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: updatedInvoice.id,
        action: "INVOICE_UPDATED",
        details: {
          changes: validatedData,
          oldStatus: existingInvoice.status,
          newStatus: updatedInvoice.status,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({
      invoice: {
        ...updatedInvoice,
        outstandingAmount: updatedInvoice.totalDue - updatedInvoice.amountPaid,
        isOverdue: updatedInvoice.status === 'OVERDUE' || (updatedInvoice.status === 'ISSUED' && updatedInvoice.dueDate < new Date()),
        daysPastDue: updatedInvoice.dueDate < new Date() 
          ? Math.ceil((new Date().getTime() - updatedInvoice.dueDate.getTime()) / (1000 * 3600 * 24))
          : 0,
        isPaid: updatedInvoice.amountPaid >= updatedInvoice.totalDue,
        paymentProgress: updatedInvoice.totalDue > 0 ? (updatedInvoice.amountPaid / updatedInvoice.totalDue) * 100 : 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, billingPeriod: true, merchantId: true },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Can only delete draft invoices
    if (existingInvoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft invoices" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: id,
        action: "INVOICE_DELETED",
        details: {
          merchantId: existingInvoice.merchantId,
          billingPeriod: existingInvoice.billingPeriod,
        },
        changedById: authResult.user.id,
      },
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}