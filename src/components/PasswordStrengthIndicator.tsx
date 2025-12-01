'use client'

import { useState, useEffect } from 'react'
import { validatePassword, getPasswordStrength, getPasswordStrengthColor } from '@/lib/password-policy'

interface PasswordStrengthIndicatorProps {
  password: string
  showSuggestions?: boolean
  className?: string
}

export function PasswordStrengthIndicator({ 
  password, 
  showSuggestions = false, 
  className = '' 
}: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState(validatePassword(password))

  useEffect(() => {
    setValidation(validatePassword(password))
  }, [password])

  if (!password) return null

  const strength = getPasswordStrength(validation.score)
  const strengthColor = getPasswordStrengthColor(validation.score)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Password Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password Strength:</span>
          <span className={`font-medium ${strengthColor}`}>
            {strength}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              validation.score >= 80 ? 'bg-green-500' :
              validation.score >= 60 ? 'bg-blue-500' :
              validation.score >= 40 ? 'bg-yellow-500' :
              validation.score >= 20 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${validation.score}%` }}
          />
        </div>
      </div>

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-red-600">Issues to fix:</h4>
          <ul className="text-sm text-red-600 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && validation.suggestions.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-blue-600">Suggestions:</h4>
          <ul className="text-sm text-blue-600 space-y-1">
            {validation.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">💡</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {validation.isValid && (
        <div className="flex items-center text-sm text-green-600">
          <span className="mr-2">✅</span>
          <span>Password meets all security requirements</span>
        </div>
      )}
    </div>
  )
}

export default PasswordStrengthIndicator
