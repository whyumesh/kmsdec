// Utility functions for file handling

/**
 * Extract file key from a Storj URL
 * @param url - The full Storj URL
 * @returns The file key or null if extraction fails
 */
export function extractFileKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Remove empty parts and the bucket name
    const cleanParts = pathParts.filter(part => part && part !== 'kmselection')
    
    if (cleanParts.length === 0) {
      return null
    }
    
    // Join the remaining parts to form the file key
    return cleanParts.join('/')
  } catch (error) {
    console.error('Error extracting file key from URL:', error)
    return null
  }
}

/**
 * Generate a fresh view URL for a document
 * @param fileKey - The file key in storage
 * @returns Promise with the fresh URL
 */
export async function generateFreshViewUrl(fileKey: string): Promise<string> {
  try {
    const response = await fetch('/api/admin/view-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKey }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate fresh URL')
    }

    const data = await response.json()
    return data.downloadUrl
  } catch (error) {
    console.error('Error generating fresh view URL:', error)
    throw error
  }
}

/**
 * Get file name from URL or file key
 * @param urlOrKey - The URL or file key
 * @param fallbackType - Fallback type if extraction fails
 * @returns The file name
 */
export function getFileName(urlOrKey: string, fallbackType: string): string {
  try {
    // If it's a URL, extract the path
    let path: string
    if (urlOrKey.startsWith('http')) {
      const url = new URL(urlOrKey)
      path = url.pathname
    } else {
      path = urlOrKey
    }
    
    const pathParts = path.split('/')
    const fileName = pathParts[pathParts.length - 1]
    
    if (fileName && fileName.includes('.')) {
      return fileName
    }
    
    return `${fallbackType}.pdf`
  } catch {
    return `${fallbackType}.pdf`
  }
}

/**
 * Get file icon based on file type
 * @param fileName - The file name
 * @returns The appropriate icon class
 */
export function getFileIcon(fileName: string): string {
  const lowerName = fileName.toLowerCase()
  
  if (lowerName.includes('image') || 
      lowerName.includes('.jpg') || 
      lowerName.includes('.jpeg') || 
      lowerName.includes('.png')) {
    return 'image'
  }
  
  return 'file'
}

