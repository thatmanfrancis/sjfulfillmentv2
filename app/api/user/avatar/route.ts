import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/user/avatar - Upload user avatar
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          public_id: `avatar_${session.userId}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { format: 'webp', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const cloudinaryResult = uploadResponse as any;

    // Update user profile with new avatar URL
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        profileImage: cloudinaryResult.secure_url,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        role: true
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Avatar updated successfully'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}