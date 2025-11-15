import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CloudinaryService } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Check if Cloudinary is configured
    if (!CloudinaryService.isConfigured()) {
      return NextResponse.json(
        { error: "Image upload service not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Check if product exists and user has access
    let whereClause: any = { id: productId };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      whereClause.businessId = authResult.user.businessId;
    }

    const product = await prisma.product.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        sku: true,
        businessId: true,
        business: {
          select: { name: true }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or access denied" },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Upload to Cloudinary
      const { upload, urls } = await CloudinaryService.uploadProductImage(buffer, file.name);

      // If this is set as primary, update other images
      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { 
            productId,
            isPrimary: true
          },
          data: { isPrimary: false }
        });
      }

      // Check if this is the first image for the product
      const imageCount = await prisma.productImage.count({
        where: { productId }
      });

      // Save image record to database
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          cloudinaryPublicId: upload.public_id,
          imageUrl: upload.secure_url,
          thumbnailUrl: urls.thumbnail,
          smallUrl: urls.small,
          mediumUrl: urls.medium,
          largeUrl: urls.large,
          altText: `${product.name} - ${product.sku}`,
          isPrimary: isPrimary || imageCount === 0, // First image is automatically primary
          fileSize: upload.bytes,
          width: upload.width,
          height: upload.height,
          format: upload.format,
          uploadedById: authResult.user.id
        }
      });

      // Update product's primary image URL if this is the primary image
      if (productImage.isPrimary) {
        await prisma.product.update({
          where: { id: productId },
          data: { imageUrl: upload.secure_url }
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          entityType: "Product",
          entityId: productId,
          action: "IMAGE_UPLOADED",
          details: {
            imageId: productImage.id,
            cloudinaryPublicId: upload.public_id,
            isPrimary: productImage.isPrimary,
            fileSize: upload.bytes,
            dimensions: `${upload.width}x${upload.height}`,
            format: upload.format
          },
          changedById: authResult.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        image: {
          id: productImage.id,
          imageUrl: productImage.imageUrl,
          thumbnailUrl: productImage.thumbnailUrl,
          smallUrl: productImage.smallUrl,
          mediumUrl: productImage.mediumUrl,
          largeUrl: productImage.largeUrl,
          isPrimary: productImage.isPrimary,
          altText: productImage.altText,
          fileSize: productImage.fileSize,
          width: productImage.width,
          height: productImage.height,
          format: productImage.format,
          createdAt: productImage.createdAt
        },
        cloudinary: {
          publicId: upload.public_id,
          secureUrl: upload.secure_url
        }
      });

    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image. Please try again." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error uploading product image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Check product access
    let whereClause: any = { id: productId };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      whereClause.businessId = authResult.user.businessId;
    }

    const product = await prisma.product.findUnique({
      where: whereClause,
      select: { id: true }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get all images for the product
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ],
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      productId,
      images: images.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        smallUrl: img.smallUrl,
        mediumUrl: img.mediumUrl,
        largeUrl: img.largeUrl,
        isPrimary: img.isPrimary,
        altText: img.altText,
        fileSize: img.fileSize,
        width: img.width,
        height: img.height,
        format: img.format,
        createdAt: img.createdAt,
        uploadedBy: img.uploadedBy ? {
          name: `${img.uploadedBy.firstName} ${img.uploadedBy.lastName}`
        } : null
      }))
    });

  } catch (error) {
    console.error("Error fetching product images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}