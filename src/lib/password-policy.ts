import { z } from 'zod'

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbiddenPasswords: string[]
  maxConsecutiveChars: number
  maxRepeatedChars: number
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  score: number // 0-100
  suggestions: string[]
}

// Simplified password policy
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: false,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPasswords: [],
  maxConsecutiveChars: 0,
  maxRepeatedChars: 0
}

// Common weak passwords
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'root', 'user', 'test', 'guest', 'demo', 'sample',
  'welcome', 'login', 'master', 'hello', 'letmein', 'monkey',
  'dragon', 'sunshine', 'princess', 'football', 'iloveyou',
  'welcome123', 'admin123', 'root123', 'test123', 'guest123'
]

/**
 * Validate password against simplified policy
 */
export function validatePassword(
  password: string, 
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const errors: string[] = []
  const suggestions: string[] = []
  let score = 0

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`)
  } else {
    score += 25
  }

  // Check maximum length
  if (password.length > policy.maxLength) {
    errors.push(`Password must be no more than ${policy.maxLength} characters long`)
  }

  // Check for uppercase letters
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else if (/[A-Z]/.test(password)) {
    score += 25
  }

  // Check for numbers
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  } else if (/\d/.test(password)) {
    score += 25
  }

  // Check for special characters
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 25
  }

  // Generate suggestions
  if (errors.length > 0) {
    suggestions.push(...generatePasswordSuggestions(password, policy))
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(100, Math.max(0, score)),
    suggestions
  }
}

/**
 * Check for consecutive characters
 */
function hasConsecutiveChars(password: string, maxConsecutive: number): boolean {
  let consecutiveCount = 1
  for (let i = 1; i < password.length; i++) {
    if (password.charCodeAt(i) === password.charCodeAt(i - 1) + 1) {
      consecutiveCount++
      if (consecutiveCount > maxConsecutive) {
        return true
      }
    } else {
      consecutiveCount = 1
    }
  }
  return false
}

/**
 * Check for repeated characters
 */
function hasRepeatedChars(password: string, maxRepeated: number): boolean {
  const charCount: { [key: string]: number } = {}
  for (const char of password) {
    charCount[char] = (charCount[char] || 0) + 1
    if (charCount[char] > maxRepeated) {
      return true
    }
  }
  return false
}

/**
 * Check for keyboard patterns
 */
function hasKeyboardPattern(password: string): boolean {
  const keyboardRows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890'
  ]
  
  const lowerPassword = password.toLowerCase()
  
  for (const row of keyboardRows) {
    for (let i = 0; i <= row.length - 3; i++) {
      const pattern = row.substring(i, i + 3)
      if (lowerPassword.includes(pattern)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Check for personal information patterns
 */
function hasPersonalInfoPattern(password: string): boolean {
  const personalPatterns = [
    /\d{4}/, // Years
    /\d{2}\/\d{2}/, // Dates
    /\d{3}-\d{2}-\d{4}/, // SSN pattern
    /\d{10}/, // Phone numbers
    /@\w+\.\w+/, // Email patterns
  ]
  
  return personalPatterns.some(pattern => pattern.test(password))
}

/**
 * Generate simplified password suggestions
 */
function generatePasswordSuggestions(password: string, policy: PasswordPolicy): string[] {
  const suggestions: string[] = []
  
  if (password.length < policy.minLength) {
    suggestions.push(`Use at least ${policy.minLength} characters`)
  }
  
  if (!/[A-Z]/.test(password) && policy.requireUppercase) {
    suggestions.push('Add uppercase letters (A-Z)')
  }
  
  if (!/\d/.test(password) && policy.requireNumbers) {
    suggestions.push('Add numbers (0-9)')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && policy.requireSpecialChars) {
    suggestions.push('Add special characters (!@#$%^&*)')
  }
  
  return suggestions
}

/**
 * Generate a secure password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = uppercase + lowercase + numbers + special
  let password = ''
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Zod schema for simplified password validation
 */
export const passwordSchema = z.string()
  .min(DEFAULT_PASSWORD_POLICY.minLength, `Password must be at least ${DEFAULT_PASSWORD_POLICY.minLength} characters`)
  .max(DEFAULT_PASSWORD_POLICY.maxLength, `Password must be no more than ${DEFAULT_PASSWORD_POLICY.maxLength} characters`)
  .refine((password) => {
    const result = validatePassword(password)
    return result.isValid
  }, {
    message: 'Password must contain: at least 6 characters, one uppercase letter, one number, and one special character'
  })

/**
 * Get password strength description
 */
export function getPasswordStrength(score: number): string {
  if (score >= 80) return 'Very Strong'
  if (score >= 60) return 'Strong'
  if (score >= 40) return 'Medium'
  if (score >= 20) return 'Weak'
  return 'Very Weak'
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  if (score >= 20) return 'text-orange-600'
  return 'text-red-600'
}
