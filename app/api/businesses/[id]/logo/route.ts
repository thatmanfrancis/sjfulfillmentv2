import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { CloudinaryService } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: businessId } = await params;

    // Check if Cloudinary is configured
    if (!CloudinaryService.isConfigured()) {
      return NextResponse.json(
        { error: "Image upload service not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max for logos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Check if business exists and user has access
    let whereClause: any = { id: businessId };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      // Users can only upload logo for their own business
      if (businessId !== authResult.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const business = await prisma.business.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        logoUrl: true // Get current logo URL to potentially delete old one
      }
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or access denied" },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Upload to Cloudinary
      const { upload, urls } = await CloudinaryService.uploadBusinessLogo(
        buffer, 
        file.name, 
        businessId
      );

      // Update business logo URL
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: { logoUrl: upload.secure_url }
      });

      // Delete old logo from Cloudinary if it exists and is from Cloudinary
      if (business.logoUrl && business.logoUrl.includes('cloudinary.com')) {
        try {
          // Extract public_id from old URL
          const urlParts = business.logoUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const publicId = fileName.split('.')[0];
          const fullPublicId = `sendjon/businesses/${businessId}/${publicId}`;
          
          await CloudinaryService.deleteImage(fullPublicId);
        } catch (deleteError) {
          console.warn('Failed to delete old logo:', deleteError);
          // Don't fail the request if old image deletion fails
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entityType: "Business",
          entityId: businessId,
          action: "LOGO_UPLOADED",
          details: {
            cloudinaryPublicId: upload.public_id,
            logoUrl: upload.secure_url,
            fileSize: upload.bytes,
            dimensions: `${upload.width}x${upload.height}`,
            format: upload.format,
            oldLogoUrl: business.logoUrl
          },
          changedById: authResult.user.id,
          User: { connect: { id: authResult.user.id } }
        },
      });

      return NextResponse.json({
        success: true,
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.name,
          logoUrl: updatedBusiness.logoUrl
        },
        logo: {
          url: upload.secure_url,
          thumbnailUrl: urls.thumbnail,
          smallUrl: urls.small,
          mediumUrl: urls.medium,
          largeUrl: urls.large,
          fileSize: upload.bytes,
          width: upload.width,
          height: upload.height,
          format: upload.format
        },
        cloudinary: {
          publicId: upload.public_id
        }
      });

    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload logo. Please try again." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error uploading business logo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: businessId } = await params;

    // Check if business exists and user has access
    let whereClause: any = { id: businessId };

    if (authResult.user.role === "MERCHANT" || authResult.user.role === "MERCHANT_STAFF") {
      if (businessId !== authResult.user.businessId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const business = await prisma.business.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        logoUrl: true
      }
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or access denied" },
        { status: 404 }
      );
    }

    if (!business.logoUrl) {
      return NextResponse.json(
        { error: "No logo to delete" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (business.logoUrl.includes('cloudinary.com')) {
      try {
        const urlParts = business.logoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = fileName.split('.')[0];
        const fullPublicId = `sendjon/businesses/${businessId}/${publicId}`;
        
        await CloudinaryService.deleteImage(fullPublicId);
      } catch (deleteError) {
        console.warn('Failed to delete logo from Cloudinary:', deleteError);
        // Continue anyway to remove from database
      }
    }

    // Remove logo URL from business
    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: { logoUrl: null }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entityType: "Business",
        entityId: businessId,
        action: "LOGO_DELETED",
        details: {
          deletedLogoUrl: business.logoUrl
        },
        changedById: authResult.user.id,
        User: { connect: { id: authResult.user.id } }
      },
    });

    return NextResponse.json({
      success: true,
      message: "Logo deleted successfully",
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        logoUrl: updatedBusiness.logoUrl
      }
    });

  } catch (error) {
    console.error("Error deleting business logo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}