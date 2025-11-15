import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

const createInvoiceSchema = z.object({
  merchantId: z.string().uuid(),
  billingPeriod: z.string(),
  dueDate: z.string().datetime().optional(),
  totalDue: z.number().positive(),
  storageCharges: z.number().min(0).optional(),
  fulfillmentFees: z.number().min(0).optional(),
  receivingFees: z.number().min(0).optional(),
  otherFees: z.number().min(0).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const merchantId = searchParams.get("merchantId");
    const status = searchParams.get("status");
    const billingPeriod = searchParams.get("billingPeriod");

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: any = {};

    if (authResult.user.role === "ADMIN") {
      // Admin can see all invoices
      if (merchantId) where.merchantId = merchantId;
    } else {
      // Merchant users can only see their own invoices
      where.merchantId = authResult.user.businessId;
    }

    if (status) where.status = status;
    if (billingPeriod) where.billingPeriod = billingPeriod;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate summary stats
    const [statusCounts, totalOutstanding] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.invoice.aggregate({
        where,
        _sum: {
          totalDue: true,
          amountPaid: true,
        },
      }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
        totalOutstanding: (totalOutstanding._sum.totalDue || 0) - (totalOutstanding._sum.amountPaid || 0),
        totalInvoices: total,
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only admins can create invoices
    if (authResult.user.role !== "ADMIN") {
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
      select: { id: true, name: true, contactEmail: true },
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

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        merchantId: validatedData.merchantId,
        billingPeriod: validatedData.billingPeriod,
        dueDate,
        totalDue: validatedData.totalDue,
        storageCharges: validatedData.storageCharges || 0,
        fulfillmentFees: validatedData.fulfillmentFees || 0,
        receivingFees: validatedData.receivingFees || 0,
        otherFees: validatedData.otherFees || 0,
        status: "PENDING",
        description: validatedData.description,
        notes: validatedData.notes,
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: "Invoice",
        entityId: newInvoice.id,
        action: "CREATE",
        details: {
          invoiceNumber: newInvoice.invoiceNumber || invoiceNumber,
          merchantId: newInvoice.merchantId,
          totalDue: newInvoice.totalDue,
        },
        changedById: authResult.user.id,
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