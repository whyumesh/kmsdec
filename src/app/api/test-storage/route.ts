import { NextRequest, NextResponse } from 'next/server'
import { freeStorageService } from '@/lib/free-storage'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request: NextRequest) {
  try {
    console.log('Testing Cloudinary configuration...')
    
    // Check if Cloudinary is configured
    const hasCloudinaryConfig = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )
    
    if (!hasCloudinaryConfig) {
      return NextResponse.json({
        success: false,
        error: 'Cloudinary not configured',
        message: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
        environment: {
          CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET
        }
      })
    }
    
    // Test Cloudinary connection
    try {
      const testResult = await freeStorageService.fileExists('test-file')
      console.log('Cloudinary test result:', testResult)
      
      return NextResponse.json({
        success: true,
        message: 'Cloudinary is configured and working',
        cloudinary: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
          apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
        }
      })
    } catch (error) {
      console.error('Cloudinary test failed:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Cloudinary connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        cloudinary: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
          apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
        }
      })
    }
    
  } catch (error) {
    console.error('Storage test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Storage test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
