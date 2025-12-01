import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

// AWS S3 Configuration
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.STORJ_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.STORJ_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || process.env.STORJ_REGION || 'us-east-1',
  bucketName: process.env.AWS_S3_BUCKET || process.env.STORJ_BUCKET_NAME || 'kms-election-documents',
  endpoint: process.env.AWS_S3_ENDPOINT || process.env.STORJ_ENDPOINT,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true' || !!process.env.STORJ_ENDPOINT,
};

// Create S3 client
export const s3Client = new S3Client({
  credentials: {
    accessKeyId: s3Config.accessKeyId!,
    secretAccessKey: s3Config.secretAccessKey!,
  },
  region: s3Config.region,
  ...(s3Config.endpoint && { endpoint: s3Config.endpoint }),
  ...(s3Config.forcePathStyle && { forcePathStyle: s3Config.forcePathStyle }),
});

// Storage service interface
export interface StorageService {
  uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string>;
  getFileUrl(fileKey: string, expiresIn?: number): Promise<string>;
  fileExists(fileKey: string): Promise<boolean>;
}

// AWS S3 Storage Implementation
class S3StorageService implements StorageService {
  async uploadFile(fileKey: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: s3Config.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin-panel',
        },
      });

      await s3Client.send(command);
      console.log(`✅ File uploaded to S3: ${fileKey}`);
      return fileKey;
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: s3Config.bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('❌ Failed to generate S3 download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: s3Config.bucketName,
        Key: fileKey,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Local Storage Implementation (fallback)
class LocalStorageService implements StorageService {
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
    // For local storage, return a direct file path
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

// Storage service factory
function createStorageService(): StorageService {
  // Check if we have cloud storage credentials
  if (s3Config.accessKeyId && s3Config.secretAccessKey) {
    console.log('🌐 Using cloud storage (S3/Storj)');
    return new S3StorageService();
  } else {
    console.log('📁 Using local storage (fallback)');
    return new LocalStorageService();
  }
}

// Export the storage service instance
export const storageService = createStorageService();

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
