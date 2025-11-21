import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional()
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        emailNotifications: true,
        smsNotifications: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications
      }
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve notification preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updatePreferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Update notification preferences
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        emailNotifications: true,
        smsNotifications: true
      }
    });

    // Log preference changes for audit
    await prisma.auditLog.create({
      data: {
        changedById: session.userId,
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        entityType: 'User',
        entityId: session.userId,
        details: {
          email: updatedUser.email,
          timestamp: new Date().toISOString(),
          changes: updateData, 
        }, 
        id: session.userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        emailNotifications: updatedUser.emailNotifications,
        smsNotifications: updatedUser.smsNotifications
      }
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}