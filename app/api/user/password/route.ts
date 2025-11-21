import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

// PUT /api/user/password
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: "Current password and new password are required" 
      }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ 
        error: "Current password is incorrect" 
      }, { status: 400 });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}