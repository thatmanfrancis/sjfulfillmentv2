import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while uploading logo` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("logo") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Logo file is required" },
        { status: 400 }
      );
    }

    // Validate file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 5MB" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const { url } = await uploadToCloudinary(file, "merchant-logos");

    // Update merchant
    const merchant = await prisma.merchant.update({
      where: { id: id },
      data: { logoUrl: url },
    });

    return NextResponse.json({
      message: "Logo uploaded successfully",
      merchant,
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}
