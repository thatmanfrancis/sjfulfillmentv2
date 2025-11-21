import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, makeAdmin } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (makeAdmin) {
      // Update user role to ADMIN
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `User ${email} has been promoted to ADMIN`,
        user: updatedUser,
      });
    } else {
      return NextResponse.json({
        user,
        message: `User found. Current role: ${user.role}`,
      });
    }

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}