import { PrismaClient } from '@prisma/client'

// Retry function for Prisma operations to handle connection issues
export async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      console.error(`Prisma operation attempt ${attempt} failed:`, error)
      
      // Check if it's a prepared statement error or connection issue
      if (error.message?.includes('prepared statement') || 
          error.message?.includes('already exists') ||
          error.message?.includes('connection') ||
          error.code === '42P05' ||
          error.code === 'P2024') {
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Wait before retrying with exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For other errors, don't retry
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// Wrapper for Prisma client methods with retry logic
export function withRetry<T extends PrismaClient>(prisma: T): T {
  const handler = {
    get(target: T, prop: string) {
      const value = target[prop as keyof T]
      
      if (typeof value === 'function') {
        return async (...args: any[]) => {
          return retryPrismaOperation(() => value.apply(target, args))
        }
      }
      
      return value
    }
  }
  
  return new Proxy(prisma, handler) as T
}
