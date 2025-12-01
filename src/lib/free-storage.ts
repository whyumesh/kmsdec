import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'

// Conditionally import cloudinary only if needed
let cloudinary: any = null
try {
  // Use eval to prevent webpack from analyzing this import at build time
  if (typeof require !== 'undefined' && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const cloudinaryModule = eval('require')('cloudinary')
    cloudinary = cloudinaryModule.v2
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }
} catch (error) {
  // Cloudinary not available, using local storage instead
}

// Free Storage Service Interface
export interface FreeStorageService {
  uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string>;
  getFileUrl(fileKey: string, expiresIn?: number): Promise<string>;
  getPermanentUrl(fileKey: string): Promise<string>;
  fileExists(fileKey: string): Promise<boolean>;
}

// Cloudinary Storage Implementation (Primary - FREE)
class CloudinaryStorageService implements FreeStorageService {
  private localStorageService?: FreeStorageService;

  private getLocalStorageService(): FreeStorageService {
    if (!this.localStorageService) {
      this.localStorageService = new LocalStorageService();
    }
    return this.localStorageService;
  }

  async uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    if (!cloudinary) {
      // Fallback to local storage if cloudinary not available
      return this.getLocalStorageService().uploadFile(fileKey, fileBuffer, contentType);
    }

    try {
      // Convert buffer to base64 for Cloudinary
      const base64String = fileBuffer.toString('base64');
      const dataUri = `data:${contentType};base64,${base64String}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataUri, {
        public_id: fileKey.replace(/\.[^/.]+$/, ""), // Remove extension
        resource_type: contentType.startsWith('image/') ? 'image' : 'raw',
        folder: 'kms-election',
        use_filename: true,
        unique_filename: true,
        type: 'upload', // Explicitly set upload type
      });
      
      console.log(`✅ File uploaded to Cloudinary: ${result.public_id}`);
      return result.public_id;
    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error);
      // Fallback to local storage on error
      return this.getLocalStorageService().uploadFile(fileKey, fileBuffer, contentType);
    }
  }

  async getFileUrl(fileKey: string, expiresIn: number = 86400): Promise<string> {
    if (!cloudinary) {
      return this.getLocalStorageService().getFileUrl(fileKey);
    }

    try {
      // Use the full fileKey as public_id (it already includes the folder)
      const publicId = fileKey;
      
      // For election documents, use longer expiration or permanent URLs
      if (expiresIn >= 604800) { // 7 days or more - use permanent URL
        const url = cloudinary.url(publicId, {
          secure: true,
          resource_type: 'raw'
        });
        return url;
      } else {
        // For shorter periods, use signed URLs
        const url = cloudinary.url(publicId, {
          secure: true,
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          resource_type: 'raw'
        });
        return url;
      }
    } catch (error) {
      console.error('❌ Failed to generate Cloudinary URL:', error);
      return this.getLocalStorageService().getFileUrl(fileKey);
    }
  }

  // Generate permanent URL for election documents (no expiration)
  async getPermanentUrl(fileKey: string): Promise<string> {
    if (!cloudinary) {
      return this.getLocalStorageService().getPermanentUrl(fileKey);
    }

    try {
      const publicId = fileKey;
      const url = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'raw',
        sign_url: false // Disable signing for permanent URLs
      });
      return url;
    } catch (error) {
      console.error('❌ Failed to generate permanent URL:', error);
      return this.getLocalStorageService().getPermanentUrl(fileKey);
    }
  }

  async fileExists(fileKey: string): Promise<boolean> {
    if (!cloudinary) {
      return this.getLocalStorageService().fileExists(fileKey);
    }

    try {
      // Use the full fileKey as public_id (it already includes the folder)
      const publicId = fileKey;
      await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      return true;
    } catch (error) {
      console.log('File not found in Cloudinary:', fileKey);
      // Check local storage as fallback
      return this.getLocalStorageService().fileExists(fileKey);
    }
  }
}

// Firebase Storage Implementation (Backup - FREE)
class FirebaseStorageService implements FreeStorageService {
  async uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      // This would require Firebase SDK setup
      // For now, return a placeholder
      console.log(`📁 Firebase upload placeholder: ${fileKey}`);
      return `firebase:${fileKey}`;
    } catch (error) {
      console.error('❌ Firebase upload failed:', error);
      throw new Error('Firebase storage not configured');
    }
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return `https://firebasestorage.googleapis.com/v0/b/your-bucket/o/${encodeURIComponent(fileKey)}`;
  }

  async getPermanentUrl(fileKey: string): Promise<string> {
    return `https://firebasestorage.googleapis.com/v0/b/your-bucket/o/${encodeURIComponent(fileKey)}`;
  }

  async fileExists(fileKey: string): Promise<boolean> {
    // Placeholder implementation
    return true;
  }
}

// Supabase Storage Implementation (Backup - FREE)
class SupabaseStorageService implements FreeStorageService {
  async uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      // This would require Supabase SDK setup
      console.log(`📁 Supabase upload placeholder: ${fileKey}`);
      return `supabase:${fileKey}`;
    } catch (error) {
      console.error('❌ Supabase upload failed:', error);
      throw new Error('Supabase storage not configured');
    }
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return `https://your-project.supabase.co/storage/v1/object/public/kms-election/${fileKey}`;
  }

  async getPermanentUrl(fileKey: string): Promise<string> {
    return `https://your-project.supabase.co/storage/v1/object/public/kms-election/${fileKey}`;
  }

  async fileExists(fileKey: string): Promise<boolean> {
    return true;
  }
}

// Local Storage Implementation (Fallback)
class LocalStorageService implements FreeStorageService {
  private uploadsDir = process.env.UPLOAD_DIR || './uploads';

  async uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const fullPath = join(process.cwd(), this.uploadsDir, fileKey);
      const dir = join(fullPath, '..');
      
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, fileBuffer);
      
      console.log(`✅ File uploaded locally: ${fileKey}`);
      return fileKey;
    } catch (error) {
      console.error('❌ Local upload failed:', error);
      throw new Error(`Failed to upload file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return `/api/admin/view-document?path=${encodeURIComponent(fileKey)}`;
  }

  async getPermanentUrl(fileKey: string): Promise<string> {
    return `/api/admin/view-document?path=${encodeURIComponent(fileKey)}`;
  }

  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const fullPath = join(process.cwd(), this.uploadsDir, fileKey);
      await readFile(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Cloudinary-Only Storage Service Factory
function createFreeStorageService(): FreeStorageService {
  // Use Cloudinary as the only storage service
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    console.log('☁️ Using Cloudinary (FREE: 25GB storage, 25GB bandwidth/month)');
    return new CloudinaryStorageService();
  }
  
  // Fallback to local storage only if Cloudinary is not configured
  console.log('📁 Cloudinary not configured - using local storage');
  console.log('⚠️  Please configure Cloudinary for production use');
  return new LocalStorageService();
}

// Export the storage service instance
export const freeStorageService = createFreeStorageService();

// Utility functions
export function generateFileKey(candidateId: string, fileType: 'aadhaar' | 'photo' | 'proposer_aadhaar', fileExtension: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `nominations/${candidateId}/${fileType}_${timestamp}_${randomId}.${fileExtension}`;
}

export function validateFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload JPG, PNG, PDF, or WebP files.'
    };
  }

  return { valid: true };
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// File upload progress tracking
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function uploadFileWithProgress(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100)
        };
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
