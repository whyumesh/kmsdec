import { writeFile, mkdir, access, constants } from 'fs/promises'
import { join, extname, basename } from 'path'
import { createHash } from 'crypto'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(',')
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// File type validation using magic numbers
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
}

// Dangerous file extensions that should be blocked
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
]

export interface FileUploadResult {
  success: boolean
  filePath?: string
  error?: string
}

export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    }
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    }
  }

  // Check file extension
  const extension = extname(file.name).toLowerCase()
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    }
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed for security reasons`
    }
  }

  // Validate file content using magic numbers
  const buffer = Buffer.from(await file.arrayBuffer())
  const isValidContent = await validateFileContent(buffer, file.type)
  
  if (!isValidContent) {
    return {
      valid: false,
      error: 'File content does not match the declared file type'
    }
  }

  // Check for suspicious patterns in filename
  const filename = basename(file.name)
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters'
    }
  }

  return { valid: true }
}

/**
 * Validate file content using magic numbers
 */
async function validateFileContent(buffer: Buffer, mimeType: string): Promise<boolean> {
  const signature = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES]
  
  if (!signature) {
    return true // Skip validation for unknown types
  }

  if (buffer.length < signature.length) {
    return false
  }

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false
    }
  }

  return true
}

export async function saveFile(
  file: File, 
  directory: string, 
  filename: string
): Promise<FileUploadResult> {
  try {
    // Validate file first
    const validation = await validateFile(file)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Validate directory path to prevent directory traversal
    if (!validateUploadPath(directory)) {
      return {
        success: false,
        error: 'Invalid directory path'
      }
    }

    const sanitizedDirectory = sanitizeFilename(directory)

    // Create directory if it doesn't exist
    const fullDir = join(process.cwd(), UPLOAD_DIR, sanitizedDirectory)
    await mkdir(fullDir, { recursive: true })

    // Verify directory was created and is accessible
    try {
      await access(fullDir, constants.W_OK)
    } catch (error) {
      return {
        success: false,
        error: 'Cannot write to upload directory'
      }
    }

    // Generate secure filename with hash
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const extension = extname(file.name)
    const fileHash = createHash('sha256')
      .update(file.name + timestamp + randomSuffix)
      .digest('hex')
      .substring(0, 16)
    
    const secureFilename = `${sanitizeFilename(filename)}_${timestamp}_${fileHash}${extension}`
    
    // Check if file already exists (very unlikely with hash)
    const filePath = join(fullDir, secureFilename)
    try {
      await access(filePath, constants.F_OK)
      // File exists, generate new name
      const newSecureFilename = `${sanitizeFilename(filename)}_${timestamp}_${fileHash}_${Math.random().toString(36).substring(2, 8)}${extension}`
      const newFilePath = join(fullDir, newSecureFilename)
      await writeFile(newFilePath, Buffer.from(await file.arrayBuffer()))
      
      return {
        success: true,
        filePath: join(UPLOAD_DIR, sanitizedDirectory, newSecureFilename)
      }
    } catch (error) {
      // File doesn't exist, proceed with upload
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      return {
        success: true,
        filePath: join(UPLOAD_DIR, sanitizedDirectory, secureFilename)
      }
    }
  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: 'Failed to save file'
    }
  }
}

export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file'
  }

  // Remove any potentially dangerous characters and patterns
  let sanitized = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars except dots and hyphens
    .replace(/\.{2,}/g, '.') // Replace multiple consecutive dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .substring(0, 100) // Limit filename length

  // Ensure filename is not empty
  if (!sanitized || sanitized === '_') {
    sanitized = 'unnamed_file'
  }

  return sanitized
}

/**
 * Validate upload directory path to prevent directory traversal
 */
export function validateUploadPath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false
  }

  // Check for directory traversal attempts
  if (path.includes('..') || path.includes('~') || path.startsWith('/') || path.startsWith('\\')) {
    return false
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./g,
    /\/\//g,
    /\\\\/g,
    /%2e%2e/gi,
    /%2f/gi,
    /%5c/gi
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(path)) {
      return false
    }
  }

  return true
}
