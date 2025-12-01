/**
 * Helper functions for viewing documents stored in Storj
 */

/**
 * Generate a fresh view URL for a document stored in Storj
 * @param fileKey - The file key stored in the database (e.g., "nominations/...")
 * @returns Promise with the fresh signed URL
 */
export async function getFreshDocumentUrl(fileKey: string): Promise<string> {
  try {
    // If it's already a full URL (contains http/https), return as is
    if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
      // Check if it's expired by trying to fetch
      try {
        const response = await fetch(fileKey, { method: 'HEAD' });
        if (response.ok) {
          return fileKey; // URL is still valid
        }
      } catch {
        // URL expired or invalid, generate fresh one
      }
      
      // Extract file key from URL if possible
      const urlMatch = fileKey.match(/nominations\/[^?]+/);
      if (urlMatch) {
        fileKey = urlMatch[0];
      } else {
        throw new Error('Cannot extract file key from URL');
      }
    }

    // Generate fresh URL via API
    const response = await fetch('/api/admin/view-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKey }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate document URL');
    }

    const data = await response.json();
    return data.downloadUrl;
  } catch (error) {
    console.error('Error generating fresh document URL:', error);
    throw error;
  }
}

/**
 * Open document in a new tab/window
 * @param fileKey - The file key stored in the database
 */
export async function viewDocument(fileKey: string): Promise<void> {
  try {
    const url = await getFreshDocumentUrl(fileKey);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error viewing document:', error);
    alert('Failed to open document. Please try again.');
  }
}

/**
 * Download document
 * @param fileKey - The file key stored in the database
 * @param fileName - The name for the downloaded file
 */
export async function downloadDocument(fileKey: string, fileName: string): Promise<void> {
  try {
    const url = await getFreshDocumentUrl(fileKey);
    
    // Fetch the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }
    
    // Get the blob
    const blob = await response.blob();
    
    // Create object URL
    const objectUrl = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Error downloading document:', error);
    alert('Failed to download document. Please try again.');
  }
}

