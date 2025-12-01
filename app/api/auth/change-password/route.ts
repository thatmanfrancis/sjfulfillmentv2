import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/notifications';


export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const { currentPassword, newPassword } = body;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        Business_User_businessIdToBusiness: {
          select: { name: true }
        }
      },
    });

    // For debugging: return the current password hash
    if (request.method === "POST" && body.debug === true) {
      return NextResponse.json({
        passwordHash: user?.passwordHash || null
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      await createAuditLog(
        session.userId,
        'User',
        session.userId,
        'PASSWORD_CHANGE_FAILED',
        { reason: 'Invalid current password', timestamp: new Date().toISOString() }
      );
      
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in database
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    // Log successful password change
    await createAuditLog(
      session.userId,
      'User',
      session.userId,
      'PASSWORD_CHANGED',
      { 
        email: user.email,
        businessName: user.Business_User_businessIdToBusiness?.name,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}