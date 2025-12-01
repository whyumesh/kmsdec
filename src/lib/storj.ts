import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storj DCS Configuration
const storjConfig = {
  accessKeyId: process.env.STORJ_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY || '',
  endpoint: (process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io')
    .replace(/^@+/, '') // Remove leading @ symbols
    .replace(/^https?:\/\//, '') // Remove http:// or https:// if present
    .replace(/^\/\//, '') // Remove double slashes
    .replace(/^/, 'https://'), // Ensure https:// prefix
  region: process.env.STORJ_REGION || 'global', // Storj uses 'global' as default
  bucketName: process.env.STORJ_BUCKET_NAME || 'kms-election-files',
  forcePathStyle: true,
};

// Check if Storj is configured
export function isStorjConfigured(): boolean {
  return !!(storjConfig.accessKeyId && storjConfig.secretAccessKey);
}

// Create S3 client for Storj (only if configured)
let storjClient: S3Client | null = null;

if (isStorjConfigured()) {
  storjClient = new S3Client({
    credentials: {
      accessKeyId: storjConfig.accessKeyId,
      secretAccessKey: storjConfig.secretAccessKey,
    },
    endpoint: storjConfig.endpoint,
    region: storjConfig.region,
    forcePathStyle: storjConfig.forcePathStyle,
  });
}

// Export storjClient for use in other modules (when available)
export { storjClient };

// Generate a unique file key for nominations
export function generateFileKey(candidateId: string, fileType: 'aadhaar' | 'photo' | 'proposer_aadhaar', fileExtension: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `nominations/${candidateId}/${fileType}_${timestamp}_${randomId}.${fileExtension}`;
}

// Generate pre-signed URL for file upload
export async function generateUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn: number = 604800 // 7 days (maximum)
): Promise<string> {
  try {
    // Validate Storj configuration with detailed error message
    if (!isStorjConfigured()) {
      throw new Error('Storj credentials not configured. STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY environment variables must be set.');
    }
    
    if (!storjClient) {
      throw new Error('Storj client not initialized. Please check your Storj configuration.');
    }

    console.log('Generating upload URL for:', {
      bucket: storjConfig.bucketName,
      key: fileKey,
      contentType,
      endpoint: storjConfig.endpoint
    });

    // Ensure file key doesn't have bucket prefix
    let normalizedKey = fileKey;
    if (normalizedKey.startsWith(`${storjConfig.bucketName}/`)) {
      normalizedKey = normalizedKey.substring(storjConfig.bucketName.length + 1);
    }
    
    const command = new PutObjectCommand({
      Bucket: storjConfig.bucketName,
      Key: normalizedKey,
      ContentType: contentType,
    });
    const signedUrl = await getSignedUrl(storjClient, command, { expiresIn });
    console.log('Generated signed URL successfully');
    return signedUrl;
  } catch (error) {
    console.error('Error generating upload URL:', error);
    console.error('Storj config:', {
      endpoint: storjConfig.endpoint,
      region: storjConfig.region,
      bucket: storjConfig.bucketName,
      hasAccessKey: !!storjConfig.accessKeyId,
      hasSecretKey: !!storjConfig.secretAccessKey
    });
    throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Check if a file exists in Storj
export async function fileExistsInStorj(fileKey: string): Promise<boolean> {
  try {
    if (!isStorjConfigured() || !storjClient) {
      return false;
    }
    
    // Normalize file key
    let normalizedKey = fileKey;
    if (normalizedKey.startsWith(`${storjConfig.bucketName}/`)) {
      normalizedKey = normalizedKey.substring(storjConfig.bucketName.length + 1);
    }
    normalizedKey = normalizedKey.replace(/^kmselection\/kmselection\//, '');
    normalizedKey = normalizedKey.replace(/^kmselection\/nominations\//, 'nominations/');
    
    const command = new HeadObjectCommand({
      Bucket: storjConfig.bucketName,
      Key: normalizedKey,
    });

    await storjClient.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.Code === 'NoSuchKey') {
      return false;
    }
    console.error('Error checking file existence in Storj:', error);
    return false;
  }
}

// Generate pre-signed URL for file download/viewing
export async function generateDownloadUrl(
  fileKey: string,
  expiresIn: number = 604800 // 7 days (maximum)
): Promise<string> {
  try {
    // Validate Storj configuration
    if (!isStorjConfigured()) {
      throw new Error('Storj credentials not configured. STORJ_ACCESS_KEY_ID and STORJ_SECRET_ACCESS_KEY environment variables must be set.');
    }
    
    if (!storjClient) {
      throw new Error('Storj client not initialized');
    }
    
    // Normalize file key - remove bucket name prefix if present
    let normalizedKey = fileKey;
    if (normalizedKey.startsWith(`${storjConfig.bucketName}/`)) {
      normalizedKey = normalizedKey.substring(storjConfig.bucketName.length + 1);
    }
    // Also handle double bucket name prefix
    normalizedKey = normalizedKey.replace(/^kmselection\/kmselection\//, '');
    normalizedKey = normalizedKey.replace(/^kmselection\/nominations\//, 'nominations/');
    
    // Verify file exists before generating URL
    const exists = await fileExistsInStorj(normalizedKey);
    if (!exists) {
      console.error(`File does not exist in Storj: ${normalizedKey} (original: ${fileKey})`);
      throw new Error(`File not found in Storj: ${normalizedKey}`);
    }
    
    const command = new GetObjectCommand({
      Bucket: storjConfig.bucketName,
      Key: normalizedKey,
    });

    const signedUrl = await getSignedUrl(storjClient, command, { expiresIn });
    console.log(`✅ Generated download URL for: ${normalizedKey}`);
    return signedUrl;
  } catch (error) {
    console.error('Error generating download URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate download URL: ${errorMessage}`);
  }
}

// Upload file directly to Storj (server-side)
export async function uploadFileToStorj(
  fileKey: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    if (!isStorjConfigured() || !storjClient) {
      throw new Error('Storj is not configured');
    }
    
    const command = new PutObjectCommand({
      Bucket: storjConfig.bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await storjClient.send(command);
    
    // Return the file key (not full URL - download URL will be generated separately)
    return fileKey;
  } catch (error) {
    console.error('Error uploading file to Storj:', error);
    throw new Error('Failed to upload file to Storj');
  }
}

// Validate file type and size
export function validateFile(file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } {
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

// Get file extension from filename
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
