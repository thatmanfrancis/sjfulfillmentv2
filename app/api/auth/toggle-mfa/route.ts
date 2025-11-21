import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const toggleMfaSchema = z.object({
  enabled: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = toggleMfaSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { enabled } = validationResult.data;

    // Update MFA status
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        twoFactorEnabled: enabled,
        // If disabling MFA, also clear the MFA secret
        mfaSecret: enabled ? undefined : null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true
      }
    });

    // Log MFA change for security
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        changedById: session.userId,
        action: enabled ? 'TWO_FACTOR_ENABLED' : 'TWO_FACTOR_DISABLED',
        entityType: 'User',
        entityId: session.userId,
        details: {
          email: updatedUser.email,
          timestamp: new Date().toISOString(),
          previousState: !enabled,
          newState: enabled
        },
        User: { connect: { id: session.userId } }
      }
    });

    return NextResponse.json({
      success: true,
      message: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      twoFactorEnabled: updatedUser.twoFactorEnabled
    });
  } catch (error) {
    console.error('Toggle MFA error:', error);
    return NextResponse.json(
      { error: 'Failed to update two-factor authentication' },
      { status: 500 }
    );
  }
}