'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Vote, AlertCircle, MapPin, ArrowLeft } from 'lucide-react'
import { getHiddenLocation } from '@/lib/geolocation'
import Logo from '@/components/Logo'

export default function VoterLoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limitedDigits = digitsOnly.slice(0, 10)
    
    setPhone(limitedDigits)
  }
  const router = useRouter()

  useEffect(() => {
    // Silently get location in background
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    try {
      const locationData = await getHiddenLocation()
      if (locationData && locationData.latitude && locationData.longitude) {
        setLocation({
          lat: locationData.latitude,
          lng: locationData.longitude
        })
      }
      // Silently fail - no error messages for location
    } catch (error) {
      // Silently fail - no error messages for location
    }
  }

  const sendOTP = async () => {
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    // Validate phone number
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/voter/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message || 'OTP has been sent to your phone number')
        setStep('otp')
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOTP = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/voter/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        // Proceed directly to login completion
        completeLogin()
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const completeLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Use location if available, otherwise use default
      const locationData = location || { lat: 19.0760, lng: 72.8777 } // Mumbai default
      
      const response = await fetch('/api/voter/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone, 
          otp, 
          location: {
            latitude: locationData.lat,
            longitude: locationData.lng
          }
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/voter/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error instanceof Error) {
        setError(`An error occurred: ${error.message}`)
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Election 2026: Shree Panvel Kutchi Maheshwari Mahajan</h1>
              </div>
            </div>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-sm flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 py-8 sm:py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="mx-auto mb-3 sm:mb-4">
              <Logo size="md" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Voter Login</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {step === 'phone' && 'Enter your registered phone number'}
              {step === 'otp' && 'Enter the OTP sent to your phone'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="7875XXXXXX"
                  autoComplete="tel"
                  maxLength={10}
                  required
                />
              </div>
              
              <Button 
                onClick={sendOTP}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || phone.length !== 10}
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-800">{successMessage}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the 6-digit OTP sent to your registered phone number
                </p>
              </div>
              
              <Button 
                onClick={verifyOTP}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              
            </div>
          )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
