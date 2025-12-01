import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateVerificationToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.isVerified) {
      return NextResponse.json({ error: 'User already verified' }, { status: 400 });
    }
    // Generate new verification token
    const token = await generateVerificationToken(user.id);
    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Please verify your email by clicking <a href="${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}">here</a>.</p>`
    });
    return NextResponse.json({ success: true, message: 'Verification email sent.' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}
