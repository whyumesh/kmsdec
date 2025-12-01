import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

export interface CSRFConfig {
  secret: string
  tokenLength: number
  cookieName: string
  headerName: string
  maxAge: number // in milliseconds
}

const DEFAULT_CONFIG: CSRFConfig = {
  secret: process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'kms-election-csrf-fallback-secret-key-2024',
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}

/* ----------------------------- Token Helpers ----------------------------- */

export function generateCSRFToken(config: CSRFConfig = DEFAULT_CONFIG): string {
  const randomValue = randomBytes(config.tokenLength).toString('hex')
  const timestamp = Date.now().toString()
  const data = `${randomValue}:${timestamp}`

  const hash = createHash('sha256').update(data + config.secret).digest('hex')
  const token = Buffer.from(`${data}:${hash}`).toString('base64')
  
  return token;
}

export function verifyCSRFToken(token: string, config: CSRFConfig = DEFAULT_CONFIG): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')

    if (parts.length !== 3) {
      return false;
    }

    const [randomValue, timestamp, hash] = parts
    const tokenTime = parseInt(timestamp)
    const age = Date.now() - tokenTime;
    
    if (age > config.maxAge) {
      return false;
    }

    const expectedHash = createHash('sha256')
      .update(`${randomValue}:${timestamp}` + config.secret)
      .digest('hex')

    return hash === expectedHash;
  } catch (error) {
    return false;
  }
}

/* --------------------------- Request Utilities --------------------------- */

export async function getCSRFTokenFromRequest(
  request: NextRequest,
  config: CSRFConfig = DEFAULT_CONFIG
): Promise<string | null> {
  if (request.method === 'POST') {
    try {
      const formData = await request.clone().formData()
      const formDataToken = formData.get('csrfToken') as string
      if (formDataToken) return formDataToken
    } catch (error) {
      // Silent fail for form data parsing
    }
  }

  const headerToken = request.headers.get(config.headerName)
  if (headerToken) return headerToken

  const cookieToken = request.cookies.get(config.cookieName)?.value
  if (cookieToken) return cookieToken

  return null
}

export function setCSRFTokenCookie(
  response: NextResponse,
  token: string,
  config: CSRFConfig = DEFAULT_CONFIG
): void {
  response.cookies.set(config.cookieName, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.maxAge / 1000,
  })
}

/* ---------------------------- Middleware Layer --------------------------- */

export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: CSRFConfig = DEFAULT_CONFIG
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    if (safeMethods.includes(request.method)) return handler(request)

    const token = await getCSRFTokenFromRequest(request, config)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Security token missing. Please refresh the page.', code: 'CSRF_TOKEN_MISSING' },
        { status: 403 }
      )
    }

    const isValid = verifyCSRFToken(token, config)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Security token expired. Please refresh the page.', code: 'CSRF_TOKEN_INVALID' },
        { status: 403 }
      )
    }

    return handler(request)
  }
}

/* ------------------------------ API Endpoint ----------------------------- */

export function generateCSRFTokenResponse(config: CSRFConfig = DEFAULT_CONFIG): NextResponse {
  const token = generateCSRFToken(config)
  const response = NextResponse.json({ csrfToken: token, timestamp: new Date().toISOString() })
  setCSRFTokenCookie(response, token, config)
  return response
}

export async function handleCSRFTokenRequest(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  return generateCSRFTokenResponse()
}

/* ------------------------------- Frontend API ---------------------------- */

export class CSRFManager {
  private token: string | null = null
  private config: CSRFConfig

  constructor(config: CSRFConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  async getToken(): Promise<string> {
    if (this.token) return this.token

    const res = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to fetch CSRF token (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    this.token = data?.csrfToken

    if (!this.token) throw new Error('Unable to obtain security token. Please refresh the page and try again.')
    return this.token
  }

  async refreshToken(): Promise<string> {
    this.token = null
    return this.getToken()
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken()
    return {
      [this.config.headerName]: token,
      'Content-Type': 'application/json',
    }
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getHeaders()
    const finalOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    }

    let response = await fetch(url, finalOptions)

    if (response.status === 403) {
      await this.refreshToken()
      const retryHeaders = await this.getHeaders()
      response = await fetch(url, {
        ...finalOptions,
        headers: { ...retryHeaders, ...(options.headers || {}) },
      })
    }

    return response
  }
}

export const csrfManager = new CSRFManager()
