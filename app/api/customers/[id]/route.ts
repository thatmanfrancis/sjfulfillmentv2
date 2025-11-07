import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while fetching customer` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id: id },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        addresses: true,
        _count: {
          select: {
            orders: true,
            payments: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while updating customer` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      customerNotes,
      tags,
      customFields,
    } = body;

    const customer = await prisma.customer.findUnique({
      where: { id: id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // If email is changing, check for duplicates
    if (email && email !== customer.email) {
      const duplicate = await prisma.customer.findUnique({
        where: {
          merchantId_email: {
            merchantId: customer.merchantId,
            email,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Customer with this email already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.customer.update({
      where: { id: id },
      data: {
        ...(email && { email }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(customerNotes !== undefined && { customerNotes }),
        ...(tags !== undefined && { tags }),
        ...(customFields !== undefined && { customFields }),
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Customer updated successfully",
      customer: updated,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while deleting customer` }, { status: 400 });
  }

  try {
    const { id } = await params;
    await prisma.customer.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: "BLOCKED",
      },
    });

    return NextResponse.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
