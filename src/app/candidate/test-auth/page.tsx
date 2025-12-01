'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState('Checking...')
  const [token, setToken] = useState('')
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/candidate/test-auth', {
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setAuthStatus('Authenticated')
        setUserInfo(data.user)
      } else {
        setAuthStatus('Not authenticated: ' + data.error)
      }
    } catch (error) {
      setAuthStatus('Error: ' + (error as Error).message)
    }
  }

  const getCookies = () => {
    const cookies = document.cookie
    setToken(cookies)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Status:</strong> {authStatus}
            </div>
            
            {userInfo && (
              <div>
                <strong>User Info:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-2">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </div>
            )}

            <Button onClick={getCookies}>
              Get Cookies
            </Button>
            
            {token && (
              <div>
                <strong>Cookies:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-2 text-xs break-all">
                  {token}
                </pre>
              </div>
            )}

            <Button onClick={checkAuth}>
              Check Auth Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
