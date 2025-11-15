import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: any[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  allowed_formats?: string[];
  max_file_size?: number;
}

export class CloudinaryService {
  /**
   * Upload file buffer to Cloudinary
   */
  static async uploadBuffer(
    buffer: Buffer, 
    filename: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const defaultOptions = {
        folder: options.folder || 'sendjon',
        resource_type: options.resource_type || 'auto',
        public_id: `${Date.now()}_${filename.split('.')[0]}`,
        allowed_formats: options.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        max_file_size: options.max_file_size || 10000000, // 10MB
      };

      const uploadOptions = { ...defaultOptions, ...options };

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (result) {
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
                url: result.url,
                format: result.format,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
              });
            } else {
              reject(new Error('Upload failed: No result returned'));
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      throw new Error(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload base64 string to Cloudinary
   */
  static async uploadBase64(
    base64String: string, 
    filename: string, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(base64String, {
        folder: options.folder || 'sendjon',
        public_id: `${Date.now()}_${filename.split('.')[0]}`,
        resource_type: options.resource_type || 'auto',
        allowed_formats: options.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        ...options,
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error) {
      throw new Error(`Base64 upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Generate optimized image URL with transformations
   */
  static getOptimizedUrl(
    publicId: string, 
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    try {
      const transformation = [];
      
      if (transformations.width) transformation.push(`w_${transformations.width}`);
      if (transformations.height) transformation.push(`h_${transformations.height}`);
      if (transformations.crop) transformation.push(`c_${transformations.crop}`);
      if (transformations.quality) transformation.push(`q_${transformations.quality}`);
      if (transformations.format) transformation.push(`f_${transformations.format}`);

      const transformString = transformation.join(',');
      
      return cloudinary.url(publicId, {
        transformation: transformString || undefined,
        secure: true,
      });
    } catch (error) {
      console.error('Error generating optimized URL:', error);
      return '';
    }
  }

  /**
   * Get multiple image sizes for responsive design
   */
  static getResponsiveUrls(publicId: string): Record<string, string> {
    const sizes = {
      thumbnail: { width: 150, height: 150, crop: 'fill' },
      small: { width: 300, height: 300, crop: 'fit' },
      medium: { width: 600, height: 600, crop: 'fit' },
      large: { width: 1200, height: 1200, crop: 'fit' },
    };

    const urls: Record<string, string> = {};
    
    for (const [size, params] of Object.entries(sizes)) {
      urls[size] = this.getOptimizedUrl(publicId, params);
    }

    return urls;
  }

  /**
   * Upload product image with predefined transformations
   */
  static async uploadProductImage(buffer: Buffer, filename: string): Promise<{
    upload: UploadResult;
    urls: Record<string, string>;
  }> {
    const upload = await this.uploadBuffer(buffer, filename, {
      folder: 'sendjon/products',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    const urls = this.getResponsiveUrls(upload.public_id);

    return { upload, urls };
  }

  /**
   * Upload business logo
   */
  static async uploadBusinessLogo(buffer: Buffer, filename: string, businessId: string): Promise<{
    upload: UploadResult;
    urls: Record<string, string>;
  }> {
    const upload = await this.uploadBuffer(buffer, filename, {
      folder: `sendjon/businesses/${businessId}`,
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    const urls = this.getResponsiveUrls(upload.public_id);

    return { upload, urls };
  }

  /**
   * Upload document (PDF, etc.)
   */
  static async uploadDocument(buffer: Buffer, filename: string, folder: string = 'documents'): Promise<UploadResult> {
    return this.uploadBuffer(buffer, filename, {
      folder: `sendjon/${folder}`,
      resource_type: 'raw',
      allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
      max_file_size: 25000000, // 25MB for documents
    });
  }

  /**
   * Check if Cloudinary is properly configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Get folder contents
   */
  static async getFolderContents(folder: string): Promise<any[]> {
    try {
      const result = await cloudinary.search
        .expression(`folder:${folder}`)
        .sort_by('created_at', 'desc')
        .max_results(100)
        .execute();

      return result.resources || [];
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      return [];
    }
  }
}

export default CloudinaryService;