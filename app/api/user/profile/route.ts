import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

// GET /api/user/profile - Get current user profile
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        department: true,
        position: true,
        location: true,
        profileImage: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        smsNotifications: true,
        mfaEnabled: true,
        twoFactorEnabled: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      bio,
      department,
      position,
      location,
      timezone,
      language,
      emailNotifications,
      smsNotifications
    } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName,
        lastName,
        phone,
        bio,
        department,
        position,
        location,
        timezone,
        language,
        emailNotifications,
        smsNotifications,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        department: true,
        position: true,
        location: true,
        profileImage: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        smsNotifications: true,
        mfaEnabled: true,
        twoFactorEnabled: true,
        role: true
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}