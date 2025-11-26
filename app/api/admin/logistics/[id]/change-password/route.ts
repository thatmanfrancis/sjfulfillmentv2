import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Only admin can change logistics password
    const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }
    const { id } = await params;
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id, role: 'LOGISTICS' },
      data: { passwordHash },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change logistics password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
