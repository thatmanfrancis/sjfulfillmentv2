import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{id: string}>}) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Only admin can update logistics
    const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }
    // Unwrap params if it's a Promise (runtime check)
    let resolvedParams = await params;
    if (params && typeof params === 'object' && typeof (params as any).then === 'function') {
      resolvedParams = await (params as any);
    }
    const { firstName, lastName, email, phone } = await req.json();
    const updated = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { firstName, lastName, email, phone },
    });
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update logistics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Only admin can delete logistics
    const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }
    // Unwrap params if it's a Promise (runtime check)
    let resolvedParams = await params;
    if (params && typeof params === 'object' && typeof (params as any).then === 'function') {
      resolvedParams = await (params as any);
    }
    // Permanently delete user and cascade related records if needed
    await prisma.$transaction([
      prisma.logisticsRegion.deleteMany({ where: { userId: resolvedParams.id } }),
      prisma.order.updateMany({ where: { assignedLogisticsId: resolvedParams.id }, data: { assignedLogisticsId: null } }),
      prisma.user.delete({ where: { id: resolvedParams.id } })
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete logistics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
