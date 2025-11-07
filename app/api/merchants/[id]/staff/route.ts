import { requireAuth } from "@/lib/auth-middleware";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching staff` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      merchantId: id,
    };

    if (status) {
      where.status = status;
    }

    const staff = await prisma.merchantStaff.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json(
      { message: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occurred while inviting staff` },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { email, role, permissions } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Check if merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Check if user exists, if not create them
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user account
      const [firstName, ...lastNameParts] = email.split("@")[0].split(".");
      const lastName = lastNameParts.join(" ") || firstName;

      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          preferredAuthMethod: "OTP",
          role: "MERCHANT_STAFF",
          status: "ACTIVE",
        },
      });
    }

    // Check if already staff
    const existingStaff = await prisma.merchantStaff.findUnique({
      where: {
        merchantId_userId: {
          merchantId: id,
          userId: user.id,
        },
      },
    });

    if (existingStaff) {
      return NextResponse.json(
        { error: "User is already a staff member" },
        { status: 409 }
      );
    }

    // Create staff invitation
    const staff = await prisma.merchantStaff.create({
      data: {
        merchantId: id,
        userId: user.id,
        role,
        permissions: permissions || {},
        invitedBy: auth.userId as string,
        status: "INVITED",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send invitation email
    const { sendMail } = await import("@/lib/nodemailer");
    await sendMail({
      to: email,
      subject: `You've been invited to join ${merchant.businessName}`,
      html: `
        <h1>Staff Invitation</h1>
        <p>You've been invited to join ${merchant.businessName} as ${role}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/staff/accept-invitation?token=${staff.id}">Accept Invitation</a>
      `,
    });

    return NextResponse.json(
      {
        message: "Staff invitation sent successfully",
        staff,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invite staff error:", error);
    return NextResponse.json(
      { error: "Failed to invite staff" },
      { status: 500 }
    );
  }
}