import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/notifications';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Verify the reset token
    const verificationToken = await verifyToken(token, 'PASSWORD_RESET');
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and delete token
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user password
      const user = await tx.user.update({
        where: { id: verificationToken.userId },
        data: { 
          passwordHash: hashedPassword
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });

      // Delete the used reset token
      await tx.verificationToken.delete({
        where: { id: verificationToken.id }
      });

      // Delete any other reset tokens for this user
      await tx.verificationToken.deleteMany({
        where: {
          userId: verificationToken.userId,
          type: 'PASSWORD_RESET'
        }
      });

      return user;
    });

    // Create audit log
    await createAuditLog(
      updatedUser.id,
      'User',
      updatedUser.id,
      'PASSWORD_RESET',
      {
        email: updatedUser.email,
        resetMethod: 'EMAIL_TOKEN'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Reset password error:', error);
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}