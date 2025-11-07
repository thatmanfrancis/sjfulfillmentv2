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
    return NextResponse.json({ message: `Error occured while uploading images` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    // Upload all images
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file, "products")
    );
    const uploads = await Promise.all(uploadPromises);

    const imageUrls = uploads.map((upload) => upload.url);

    // Update product
    const product = await prisma.product.update({
      where: { id: id },
      data: { images: imageUrls },
    });

    return NextResponse.json({
      message: "Product images updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update images error:", error);
    return NextResponse.json(
      { error: "Failed to update product images" },
      { status: 500 }
    );
  }
}
