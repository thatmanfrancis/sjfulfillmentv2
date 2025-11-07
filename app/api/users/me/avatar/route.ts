import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while updating avatar` }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Avatar file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 5MB" },
        { status: 400 }
      );
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: { avatarUrl: true },
    });

    // Delete old avatar if exists
    if (currentUser?.avatarUrl) {
      try {
        // Extract public_id from cloudinary URL
        const urlParts = currentUser.avatarUrl.split("/");
        const publicIdWithExt = urlParts.slice(-2).join("/");
        const publicId = publicIdWithExt.split(".")[0];
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error("Error deleting old avatar:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new avatar
    const { url } = await uploadToCloudinary(file, "avatars");

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId as string },
      data: { avatarUrl: url },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occured while removing avatar` }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId as string },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return NextResponse.json(
        { error: "No avatar to delete" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    try {
      const urlParts = user.avatarUrl.split("/");
      const publicIdWithExt = urlParts.slice(-2).join("/");
      const publicId = publicIdWithExt.split(".")[0];
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error("Error deleting from cloudinary:", error);
    }

    // Remove from database
    await prisma.user.update({
      where: { id: auth.userId as string },
      data: { avatarUrl: null },
    });

    return NextResponse.json({
      message: "Avatar deleted successfully",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
