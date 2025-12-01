'use client'

import { useState, useEffect, useCallback } from 'react'
import { csrfManager } from '@/lib/csrf'

export interface UseCSRFReturn {
  token: string | null
  isLoading: boolean
  error: string | null
  refreshToken: () => Promise<void>
  getHeaders: () => Promise<Record<string, string>>
  fetch: (url: string, options?: RequestInit) => Promise<Response>
}

export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const refreshToken = useCallback(async () => {
    setIsLoading(true)
    try {
      const newToken = await csrfManager.refreshToken()
      setToken(newToken)
    } catch (err) {
      console.error('CSRF refresh error:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh CSRF token')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getHeaders = useCallback(async () => {
    try {
      return await csrfManager.getHeaders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get CSRF headers')
      throw err
    }
  }, [])

  const fetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        const res = await csrfManager.fetch(url, options)
        if (res.status === 403) throw new Error('CSRF token invalid or expired')
        return res
      } catch (err) {
        console.error('CSRF fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to make CSRF-protected request')
        throw err
      }
    },
    []
  )

  useEffect(() => {
    refreshToken()
  }, [refreshToken])

  return { token, isLoading, error, refreshToken, getHeaders, fetch }
}

export default useCSRF
