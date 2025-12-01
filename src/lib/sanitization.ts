import { logger } from './logger'

// Sanitization configuration
interface SanitizationConfig {
  maxLength: number
  allowedChars: RegExp
  removeHtml: boolean
  normalizeWhitespace: boolean
}

// Production input sanitizer
class ProductionSanitizer {
  private config: SanitizationConfig

  constructor(config: SanitizationConfig = {
    maxLength: 1000,
    allowedChars: /^[a-zA-Z0-9\s\-_.,@()]+$/,
    removeHtml: true,
    normalizeWhitespace: true
  }) {
    this.config = config
  }

  private logSanitization(input: string, output: string, context: string) {
    if (input !== output) {
      logger.warn('Input sanitized', {
        original: input,
        sanitized: output,
        context
      })
    }
  }

  private removeHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '')
  }

  private normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim()
  }

  private validateLength(input: string, maxLength: number): string {
    if (input.length > maxLength) {
      logger.warn('Input truncated due to length', {
        originalLength: input.length,
        maxLength,
        truncated: input.substring(0, maxLength)
      })
      return input.substring(0, maxLength)
    }
    return input
  }

  private validateChars(input: string): string {
    if (!this.config.allowedChars.test(input)) {
      logger.warn('Input contains invalid characters', {
        input,
        allowedPattern: this.config.allowedChars.toString()
      })
      return input.replace(/[^a-zA-Z0-9\s\-_.,@()]/g, '')
    }
    return input
  }

  public sanitize(input: string, context: string = 'unknown'): string {
    if (typeof input !== 'string') {
      logger.warn('Non-string input provided to sanitizer', {
        type: typeof input,
        context
      })
      return ''
    }

    let sanitized = input

    // Remove HTML tags
    if (this.config.removeHtml) {
      sanitized = this.removeHtml(sanitized)
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      sanitized = this.normalizeWhitespace(sanitized)
    }

    // Validate characters
    sanitized = this.validateChars(sanitized)

    // Validate length
    sanitized = this.validateLength(sanitized, this.config.maxLength)

    // Log if sanitization occurred
    this.logSanitization(input, sanitized, context)

    return sanitized
  }

  public sanitizeEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = this.sanitize(email.toLowerCase(), 'email')
    
    if (!emailRegex.test(sanitized)) {
      logger.warn('Invalid email format', { email: sanitized })
      throw new Error('Invalid email format')
    }
    
    return sanitized
  }

  public sanitizePhone(phone: string): string {
    // Remove all non-digit characters
    const sanitized = phone.replace(/\D/g, '')
    
    if (sanitized.length < 10 || sanitized.length > 15) {
      logger.warn('Invalid phone number length', { 
        original: phone, 
        sanitized, 
        length: sanitized.length 
      })
      throw new Error('Invalid phone number')
    }
    
    return sanitized
  }

  public sanitizeId(id: string): string {
    const sanitized = this.sanitize(id, 'id')
    
    if (sanitized.length < 10) {
      logger.warn('ID too short', { id: sanitized })
      throw new Error('Invalid ID format')
    }
    
    return sanitized
  }

  public sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, '')
    sanitized = sanitized.replace(/[\/\\]/g, '_')
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_')
    
    // Limit length
    sanitized = this.validateLength(sanitized, 255)
    
    if (sanitized !== fileName) {
      logger.warn('Filename sanitized', {
        original: fileName,
        sanitized
      })
    }
    
    return sanitized
  }

  public sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input)
        return this.sanitizeJson(parsed)
      } catch (error) {
        logger.warn('Invalid JSON input', { input })
        return null
      }
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item))
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitize(key, 'json-key')
        sanitized[sanitizedKey] = this.sanitizeJson(value)
      }
      return sanitized
    }

    if (typeof input === 'string') {
      return this.sanitize(input, 'json-string')
    }

    return input
  }
}

// Create sanitizer instance
export const sanitizer = new ProductionSanitizer()

// Convenience functions
export function sanitizeInput(input: string, context?: string): string {
  return sanitizer.sanitize(input, context)
}

export function sanitizeEmail(email: string): string {
  return sanitizer.sanitizeEmail(email)
}

export function sanitizePhone(phone: string): string {
  return sanitizer.sanitizePhone(phone)
}

export function sanitizeId(id: string): string {
  return sanitizer.sanitizeId(id)
}

export function sanitizeFileName(fileName: string): string {
  return sanitizer.sanitizeFileName(fileName)
}

export function sanitizeJson(input: any): any {
  return sanitizer.sanitizeJson(input)
}

// Export types
export type { SanitizationConfig }