import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const createInvoiceSchema = z.object({
  merchantId: z.string().uuid(),
  billingPeriod: z.string(),
  dueDate: z.string().datetime().optional(),
  totalDue: z.number().positive(),
  storageCharges: z.number().min(0).optional(),
  fulfillmentFees: z.number().min(0).optional(),
  receivingFees: z.number().min(0).optional(),
  otherFees: z.number().min(0).optional(),
});

//  /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can create invoices
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create invoices" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createInvoiceSchema.parse(body);

    // Check if merchant exists
    const merchant = await prisma.business.findUnique({
      where: { id: validatedData.merchantId },
      select: { 
        id: true, 
        name: true, 
        contactPhone: true
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Calculate due date if not provided (30 days from now)
    const dueDate = validatedData.dueDate 
      ? new Date(validatedData.dueDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newInvoice = await prisma.invoice.create({
      data: {
        id: crypto.randomUUID(),
        merchantId: validatedData.merchantId,
        billingPeriod: validatedData.billingPeriod,
        dueDate,
        totalDue: validatedData.totalDue,
        storageCharges: validatedData.storageCharges || 0,
        fulfillmentFees: validatedData.fulfillmentFees || 0,
        receivingFees: validatedData.receivingFees || 0,
        otherFees: validatedData.otherFees || 0,
        status: "ISSUED",
      },
      include: {
        Business: {
          select: {
            id: true,
            name: true,
            contactPhone: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Invoice",
        entityId: newInvoice.id,
        action: "CREATE",
        details: {
          merchantId: newInvoice.merchantId,
          totalDue: newInvoice.totalDue,
          billingPeriod: newInvoice.billingPeriod,
        },
        changedById: session.userId,
        User: { connect: { id: session.userId } }
      },
    });

    return NextResponse.json({
      invoice: newInvoice,
      message: "Invoice created successfully",
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}