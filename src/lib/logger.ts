// Production logging levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Log entry interface
interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: any
  requestId?: string
  userId?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

// Production logger class
class ProductionLogger {
  private logLevel: LogLevel
  private isProduction: boolean
  private isServerless: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.logLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG
    // Check if we're in a serverless environment (AWS Lambda only)
    this.isServerless = !!(
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_REGION
    )
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex <= currentLevelIndex
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date().toISOString()
    const level = entry.level.padEnd(5)
    const context = entry.context ? `[${entry.context}]` : ''
    const requestId = entry.requestId ? `[${entry.requestId}]` : ''
    const userId = entry.userId ? `[${entry.userId}]` : ''
    
    let logLine = `${timestamp} ${level} ${context}${requestId}${userId} ${entry.message}`
    
    if (entry.data) {
      logLine += ` | Data: ${JSON.stringify(entry.data)}`
    }
    
    if (entry.error) {
      logLine += ` | Error: ${entry.error.message}`
      if (entry.error.code) {
        logLine += ` | Code: ${entry.error.code}`
      }
    }
    
    return logLine + '\n'
  }

  private async writeToFile(filename: string, content: string) {
    // In serverless environments, skip file logging
    if (this.isServerless) {
      return
    }
    
    try {
      const { writeFile } = await import('fs/promises')
      const { join } = await import('path')
      
      // Only write to file in non-serverless production environments
      if (!this.isServerless) {
        await writeFile(join(process.cwd(), 'logs', filename), content, { flag: 'a' })
      }
    } catch (error) {
      // Silently fail - serverless doesn't support file writes
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string, requestId?: string, userId?: string, error?: any) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
      requestId,
      userId,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    }

    const logLine = this.formatLogEntry(entry)

    // Console output for development or serverless
    if (!this.isProduction || this.isServerless) {
      const colors = {
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.INFO]: '\x1b[36m',  // Cyan
        [LogLevel.DEBUG]: '\x1b[37m'  // White
      }
      const color = this.isServerless ? '' : colors[level]
      const reset = this.isServerless ? '' : '\x1b[0m'
      console.log(`${color}${logLine}${reset}`)
    }

    // File output for production (non-serverless only)
    if (this.isProduction && !this.isServerless) {
      this.writeToFile('application.log', logLine).catch(() => {})
      
      // Separate error log for errors
      if (level === LogLevel.ERROR) {
        this.writeToFile('error.log', logLine).catch(() => {})
      }
    }
  }

  error(message: string, data?: any, context?: string, requestId?: string, userId?: string, error?: any) {
    this.log(LogLevel.ERROR, message, data, context, requestId, userId, error)
  }

  warn(message: string, data?: any, context?: string, requestId?: string, userId?: string) {
    this.log(LogLevel.WARN, message, data, context, requestId, userId)
  }

  info(message: string, data?: any, context?: string, requestId?: string, userId?: string) {
    this.log(LogLevel.INFO, message, data, context, requestId, userId)
  }

  debug(message: string, data?: any, context?: string, requestId?: string, userId?: string) {
    this.log(LogLevel.DEBUG, message, data, context, requestId, userId)
  }

  // Performance logging
  performance(operation: string, duration: number, data?: any, requestId?: string) {
    this.info(`Performance: ${operation} completed in ${duration}ms`, data, 'PERFORMANCE', requestId)
  }

  // Security logging
  security(event: string, data?: any, requestId?: string, userId?: string) {
    this.warn(`Security: ${event}`, data, 'SECURITY', requestId, userId)
  }

  // Database logging
  database(operation: string, data?: any, requestId?: string) {
    this.debug(`Database: ${operation}`, data, 'DATABASE', requestId)
  }

  // API logging
  api(method: string, endpoint: string, status: number, duration: number, requestId?: string) {
    this.info(`API: ${method} ${endpoint} - ${status} (${duration}ms)`, undefined, 'API', requestId)
  }

  // Log authentication events
  logAuth(userId: string, event: string, success: boolean, data?: any) {
    const message = `Auth: ${event} ${success ? 'succeeded' : 'failed'}`
    const level = success ? LogLevel.INFO : LogLevel.WARN
    this.log(level, message, data, 'AUTH', undefined, userId)
  }

  // Log request events
  logRequest(request: any, message: string) {
    this.info(message, undefined, 'REQUEST')
  }

  // Log errors with full context
  logError(error: Error, message: string, context?: any) {
    this.error(message, context, 'ERROR', undefined, undefined, error)
  }
}

// Export singleton instance
export const logger = new ProductionLogger()

// Helper functions for convenience
export function logAuth(userId: string, event: string, success: boolean, data?: any) {
  logger.logAuth(userId, event, success, data)
}

export function logRequest(request: any, message: string) {
  logger.logRequest(request, message)
}

// Export types for TypeScript
export type { LogEntry }
export type LogContext = {
  endpoint?: string
  method?: string
  [key: string]: any
}