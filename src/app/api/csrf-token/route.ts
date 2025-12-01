import { NextRequest } from 'next/server'
import { handleCSRFTokenRequest } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  return handleCSRFTokenRequest(request)
}
