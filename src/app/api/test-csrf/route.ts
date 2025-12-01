import { NextRequest, NextResponse } from 'next/server';
import { withCSRFProtection } from '@/lib/csrf';

async function handler(request: NextRequest) {
  return NextResponse.json({
    message: 'CSRF test successful',
    timestamp: new Date().toISOString(),
    method: request.method
  });
}

export const POST = withCSRFProtection(handler);
export const GET = handler;
