import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { freeStorageService, generateFileKey, validateFile, getFileExtension } from '@/lib/free-storage'
import { logger } from '@/lib/logger'
import { rateLimiter } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/sanitization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Production error handler
class ProductionErrorHandler {
  static handle(error: any, context: string): NextResponse {
    logger.error(`Production Error in ${context}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context
    })

    // Don't expose internal errors in production
    const safeError = {
      error: 'Internal server error',
      requestId: Date.now().toString(),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(safeError, { status: 500 })
  }

  static validateRequest(request: NextRequest): { valid: boolean; error?: NextResponse } {
    try {
      // Rate limiting
      const clientId = request.headers.get('x-forwarded-for') || 'unknown'
      if (!rateLimiter.allow(clientId)) {
        return {
          valid: false,
          error: NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          )
        }
      }

      // Content-Type validation
      const contentType = request.headers.get('content-type')
      if (!contentType?.includes('multipart/form-data')) {
        return {
          valid: false,
          error: NextResponse.json(
            { error: 'Invalid content type' },
            { status: 400 }
          )
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: this.handle(error, 'request-validation')
      }
    }
  }
}

// Database resilience handler
class DatabaseResilience {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}) in ${context}:`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          context
        })

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Database operation failed after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
  }
}

// Cloudinary resilience handler
class CloudinaryResilience {
  static async uploadWithFallback(
    fileKey: string,
    fileBuffer: Buffer,
    contentType: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await freeStorageService.uploadFile(fileKey, fileBuffer, contentType)
        logger.info(`Cloudinary upload successful (attempt ${attempt})`, { fileKey })
        return result
      } catch (error) {
        lastError = error
        logger.warn(`Cloudinary upload failed (attempt ${attempt}/${maxRetries}):`, {
          error: error instanceof Error ? error.message : String(error),
          fileKey,
          attempt
        })

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Fallback to local storage if Cloudinary fails completely
    logger.error('Cloudinary upload failed completely, falling back to local storage', {
      fileKey,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    })

    try {
      const localResult = await freeStorageService.uploadFile(fileKey, fileBuffer, contentType)
      logger.info('Fallback to local storage successful', { fileKey })
      return localResult
    } catch (fallbackError) {
      throw new Error(`All storage methods failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`)
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const requestId = Date.now().toString()

  try {
    logger.info('Upload documents request started', {
      requestId,
      candidateId: params.id,
      timestamp: new Date().toISOString()
    })

    // Production request validation
    const validation = ProductionErrorHandler.validateRequest(request)
    if (!validation.valid) {
      return validation.error!
    }

    // Input sanitization
    const candidateId = sanitizeInput(params.id)
    if (!candidateId || candidateId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 }
      )
    }

    // Database operation with retry
    const candidate = await DatabaseResilience.executeWithRetry(
      async () => {
        return await prisma.yuvaPankhCandidate.findFirst({
          where: { id: candidateId },
          include: {
            user: true,
            zone: true
          }
        })
      },
      3,
      'find-candidate'
    )

    if (!candidate) {
      logger.warn('Candidate not found', { candidateId, requestId })
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    // Parse form data with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error: any) {
      logger.error('Failed to parse form data', { error: error instanceof Error ? error.message : String(error), requestId })
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }

    // Extract and validate files
    const candidateAadhaar = formData.get('candidateAadhaar') as File | null
    const candidatePhoto = formData.get('candidatePhoto') as File | null
    const proposerAadhaar = formData.get('proposerAadhaar') as File | null

    if (!candidateAadhaar && !candidatePhoto && !proposerAadhaar) {
      return NextResponse.json(
        { error: 'At least one document must be provided' },
        { status: 400 }
      )
    }

    // Comprehensive file validation
    const files = [
      { file: candidateAadhaar, type: 'aadhaar' as const },
      { file: candidatePhoto, type: 'photo' as const },
      { file: proposerAadhaar, type: 'proposer_aadhaar' as const }
    ].filter(item => item.file)

    for (const { file, type } of files) {
      if (file) {
        const validation = validateFile(file, 10) // 10MB limit
        if (!validation.valid) {
          logger.warn('File validation failed', {
            type,
            error: validation.error,
            fileName: file.name,
            fileSize: file.size,
            requestId
          })
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          )
        }
      }
    }

    const filePaths: {
      candidateAadhaar?: string
      candidatePhoto?: string
      proposerAadhaar?: string
    } = {}

    // Process each file with resilience
    for (const { file, type } of files) {
      if (file && file.size > 0) {
        try {
          const fileExtension = getFileExtension(file.name) || 'pdf'
          const fileKey = generateFileKey(candidateId, type, fileExtension)
          
          // Convert file to buffer with error handling
          let fileBuffer: Buffer
          try {
            fileBuffer = Buffer.from(await file.arrayBuffer())
          } catch (error: any) {
            logger.error('Failed to convert file to buffer', {
              error: error instanceof Error ? error.message : String(error),
              fileName: file.name,
              type,
              requestId
            })
            return NextResponse.json(
              { error: 'Failed to process file' },
              { status: 400 }
            )
          }
          
          // Determine content type
          const contentType = file.type || 
            (fileExtension === 'pdf' ? 'application/pdf' :
             fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
             fileExtension === 'png' ? 'image/png' :
             'application/octet-stream')

          // Upload to Cloudinary using the free storage service
          const uploadedKey = await CloudinaryResilience.uploadWithFallback(
            fileKey,
            fileBuffer,
            contentType,
            3
          )
          
          // Store file metadata in database for tracking
          await prisma.uploadedFile.create({
            data: {
              userId: candidate.userId || candidateId,
              fileName: `${type}_${Date.now()}.${fileExtension}`,
              fileType: type,
              originalName: file.name,
              mimeType: contentType,
              size: file.size,
              filePath: uploadedKey, // Store Cloudinary public_id
              fileData: '' // Empty string - file stored in Cloudinary
            }
          })
          
          if (type === 'aadhaar') {
            filePaths.candidateAadhaar = uploadedKey
          } else if (type === 'photo') {
            filePaths.candidatePhoto = uploadedKey
          } else if (type === 'proposer_aadhaar') {
            filePaths.proposerAadhaar = uploadedKey
          }
          
          logger.info(`File uploaded successfully`, {
            type,
            fileKey: uploadedKey,
            fileSize: fileBuffer.length,
            requestId
          })
        } catch (error: any) {
          logger.error(`Failed to upload ${type}`, {
            error: error instanceof Error ? error.message : String(error),
            fileName: file.name,
            type,
            requestId
          })
          return NextResponse.json(
            { error: `Failed to upload ${type}` },
            { status: 500 }
          )
        }
      }
    }

    // Update database with retry
    await DatabaseResilience.executeWithRetry(
      async () => {
        // Get existing experience data
        let experienceData: any = {}
        try {
          experienceData = candidate.experience ? JSON.parse(candidate.experience) : {}
        } catch (error) {
          logger.warn('Failed to parse existing experience data', {
            error: error instanceof Error ? error.message : String(error),
            candidateId,
            requestId
          })
          experienceData = {}
        }

        // Merge file paths
        const updatedExperienceData = {
          ...experienceData,
          filePaths: {
            ...experienceData.filePaths,
            ...filePaths
          }
        }

        return await prisma.yuvaPankhCandidate.update({
          where: { id: candidateId },
          data: {
            experience: JSON.stringify(updatedExperienceData),
            updatedAt: new Date()
          }
        })
      },
      3,
      'update-candidate'
    )

    const processingTime = Date.now() - startTime

    logger.info('Documents uploaded successfully', {
      candidateId,
      filePaths,
      processingTime,
      requestId
    })

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      filePaths,
      requestId,
      processingTime
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    
    logger.error('Upload documents request failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      candidateId: params.id,
      processingTime,
      requestId
    })

    return ProductionErrorHandler.handle(error, 'upload-documents')
  }
}