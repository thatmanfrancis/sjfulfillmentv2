import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

// Consolidated, schema-aligned handlers for /api/customers/:id

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Next's types may provide params as a Promise (see validator types); await to be safe
  const { id } = await context.params;

  try {
    const { isAdmin, merchantIds } = await getUserMerchantContext(auth.userId as string);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        orders: {
          take: 20,
          orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
        merchant: { select: { id: true, businessName: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    if (!isAdmin && !merchantIds.includes(customer.merchantId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [orderCount, lifetimeAgg] = await Promise.all([
      prisma.order.count({ where: { customerId: id } }),
      prisma.order.aggregate({ where: { customerId: id }, _sum: { totalAmount: true } }),
    ]);

    const lifetimeValue = Number(lifetimeAgg._sum?.totalAmount ?? 0);

    return NextResponse.json({ customer: { ...customer, orderCount, lifetimeValue } });
  } catch (err) {
    console.error("Get customer error:", err);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { email, firstName, lastName, phone, customerNotes, tags, customFields, status } = body;
    if (!firstName || !lastName || !email) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const { isAdmin, merchantIds } = await getUserMerchantContext(auth.userId as string);
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!isAdmin && !merchantIds.includes(existing.merchantId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (email && email !== existing.email) {
      const duplicate = await prisma.customer.findUnique({ where: { merchantId_email: { merchantId: existing.merchantId, email } as any } });
      if (duplicate) return NextResponse.json({ error: "Customer with this email already exists" }, { status: 409 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(customerNotes !== undefined && { customerNotes }),
        ...(tags !== undefined && { tags }),
        ...(customFields !== undefined && { customFields }),
        ...(status !== undefined && { status }),
      },
      include: { merchant: { select: { id: true, businessName: true } } },
    });

    return NextResponse.json({ message: "Customer updated", customer: updated });
  } catch (err) {
    console.error("Update customer error:", err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const { isAdmin, merchantIds } = await getUserMerchantContext(auth.userId as string);
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!isAdmin && !merchantIds.includes(existing.merchantId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), status: "BLOCKED" } });
    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete customer error:", err);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
