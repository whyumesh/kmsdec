// Shared utility functions
// This file contains shared utilities to reduce duplication across functions

// Minimal error handling
export const handleError = (error: unknown, context: string) => {
  console.error(`Error in ${context}:`, error instanceof Error ? error.message : 'Unknown error')
  return {
    error: error instanceof Error ? error.message : 'Internal server error',
    context
  }
}

// Minimal response helpers
export const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

// Minimal validation
export const validateRequired = (obj: Record<string, any>, fields: string[]) => {
  const missing = fields.filter(field => !obj[field])
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
}

// Minimal CSRF check (simplified)
export const checkCSRF = (request: Request) => {
  const token = request.headers.get('x-csrf-token')
  return token === process.env.CSRF_SECRET
}
