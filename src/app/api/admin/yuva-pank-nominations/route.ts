import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const nominations = await prisma.yuvaPankhCandidate.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const formattedNominations = await Promise.all(nominations.map(async (nomination) => {
      let documents = null
      let experienceData = null
      let educationData = null
      
      try {
        documents = nomination.rejectionReason ? JSON.parse(nomination.rejectionReason) : null
      } catch (error) {
        // If parsing fails, documents will remain null
      }

      try {
        experienceData = nomination.experience ? JSON.parse(nomination.experience) : null
      } catch (error) {
        // If parsing fails, experienceData will remain null
      }

      try {
        educationData = nomination.education ? JSON.parse(nomination.education) : null
      } catch (error) {
        // If parsing fails, educationData will remain null
      }

      // Get file keys from nomination record (prefer fileKeys, fallback to filePaths)
      const fileKeys = experienceData?.fileKeys || experienceData?.filePaths || {};
      
      // Try to retrieve files from UploadedFile table for this user
      let filePaths: any = {};
      
      try {
        // Ensure userId is not null
        if (!nomination.userId) {
          throw new Error('Nomination userId is null');
        }
        
        const uploadedFiles = await prisma.uploadedFile.findMany({
          where: {
            userId: nomination.userId,
            fileType: {
              in: ['aadhaar', 'photo', 'proposer_aadhaar']
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        });

        // Map file types to keys
        const fileTypeMap: { [key: string]: string } = {
          'aadhaar': 'candidateAadhaar',
          'photo': 'candidatePhoto',
          'proposer_aadhaar': 'proposerAadhaar'
        };

        // Use fileKeys from nomination, or fallback to filePath from UploadedFile
        for (const file of uploadedFiles) {
          const fileKey = fileKeys[fileTypeMap[file.fileType]] || file.filePath;
          filePaths[fileTypeMap[file.fileType]] = fileKey || '';
        }

        // If no files found in UploadedFile, use fileKeys from nomination
        if (Object.keys(filePaths).length === 0) {
          filePaths = { ...fileKeys };
        }
      } catch (fileError) {
        console.error(`Error retrieving files for nomination ${nomination.id}:`, fileError);
        // Fallback to stored filePaths from nomination
        filePaths = { ...fileKeys };
      }

      return {
        id: nomination.id,
        userId: nomination.userId,
        name: nomination.name,
        email: nomination.email,
        phone: nomination.phone,
        position: nomination.position,
        region: nomination.region,
        status: nomination.status,
        submittedAt: nomination.createdAt.toISOString(),
        rejectionReason: nomination.rejectionReason,
        documents: documents,
        // Detailed candidate information
        candidateDetails: {
          fatherSpouse: experienceData?.fatherSpouse || '',
          alias: experienceData?.alias || '',
          address: experienceData?.address || '',
          gender: educationData?.gender || '',
          birthDate: educationData?.birthDate || '',
          filePaths: filePaths // Now contains fileKeys that can be used to generate fresh URLs
        },
        proposerDetails: educationData?.proposerDetails || {}
      }
    }))

    const response = NextResponse.json({
      nominations: formattedNominations,
      timestamp: new Date().toISOString(),
      count: formattedNominations.length
    })

    // Force no caching at all levels
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    response.headers.set('CDN-Cache-Control', 'no-store')
    
    return response

  } catch (error) {
    console.error('Error fetching Yuva Pankh nominations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
