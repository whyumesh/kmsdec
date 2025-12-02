import { NextRequest } from 'next/server'
import { handleCSRFTokenRequest } from '@/lib/csrf'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request: NextRequest) {
  return handleCSRFTokenRequest(request)
}
