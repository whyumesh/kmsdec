'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Vote, AlertCircle } from 'lucide-react'
import SavedLoginSelector from '@/components/SavedLoginSelector'
import { saveCredential } from '@/lib/saved-credentials'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [userRole, setUserRole] = useState<'ADMIN' | 'CANDIDATE' | 'VOTER' | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        const session = await getSession()
        if (session?.user) {
          // Save credentials if Remember Me is checked
          if (rememberMe && session.user.role) {
            saveCredential(email, password, session.user.role as 'ADMIN' | 'CANDIDATE' | 'VOTER', session.user.name || email.split('@')[0])
          }
          // Redirect based on user role
          switch (session.user.role) {
            case 'ADMIN':
              router.push('/admin/dashboard')
              break
            case 'CANDIDATE':
              router.push('/candidate/dashboard')
              break
            case 'VOTER':
              router.push('/voter/dashboard')
              break
            default:
              router.push('/')
          }
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen election-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Vote className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Sign In</CardTitle>
          <CardDescription className="text-white/80">
            Access your election account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Saved Login Selector - Show all roles */}
            <div className="space-y-2">
              <SavedLoginSelector
                onCredentialSelect={(email, password) => {
                  setEmail(email)
                  setPassword(password)
                }}
                role="ADMIN"
              />
              <SavedLoginSelector
                onCredentialSelect={(email, password) => {
                  setEmail(email)
                  setPassword(password)
                }}
                role="CANDIDATE"
              />
              <SavedLoginSelector
                onCredentialSelect={(email, password) => {
                  setEmail(email)
                  setPassword(password)
                }}
                role="VOTER"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
              />
              <Label htmlFor="rememberMe" className="text-sm text-white/80">
                Remember me for future logins
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-white text-blue-600 hover:bg-gray-100"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-white hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-white/80 text-sm mt-2">
              <Link href="/voter/login" className="text-white hover:underline">
                Voter Login (OTP)
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
