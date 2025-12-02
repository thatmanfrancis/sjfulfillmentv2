import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { name, email, role } = await request.json();
    // Generate a random password
    const password = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(password, 10);
    // Create staff user in DB
    const user = await prisma.user.create({
      data: {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        email,
        passwordHash,
        role,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
        isVerified: true,
        updatedAt: new Date(),
      },
    });
    // Send email to staff with credentials
    await sendEmail({
      to: email,
      subject: "Your Merchant Staff Account",
      html: `<p>Hello ${name},</p><p>Your account has been created.</p><p><b>Email:</b> ${email}<br/><b>Password:</b> ${password}</p>`,
    });
    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
