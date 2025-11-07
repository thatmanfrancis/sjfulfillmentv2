import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// For uploading avatars to the cloud
export async function uploadToCloudinary(
  file: File,
  folder: string = "avatars"
): Promise<{ url: string; publicId: string }> {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: "auto",
    transformation: [
      { width: 500, height: 500, crop: "fill", gravity: "face" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// For deleting avatars from the cloud
export async function deleteFromCloudinary(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}
