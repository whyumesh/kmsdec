import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Production database configuration
const createPrismaClient = () => {
  // Hardcode the Neon database URL for production reliability
  const databaseUrl = "postgresql://neondb_owner:npg_S8lUFoJtxCj6@ep-dry-paper-a1fgokjj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

  logger.info('Creating Prisma client', {
    url: databaseUrl.substring(0, 50) + '...',
    environment: process.env.NODE_ENV
  })

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: 'minimal',
  })

  return client
}

// Create Prisma client with error handling
let prisma: PrismaClient

try {
  prisma = globalForPrisma.prisma ?? createPrismaClient()
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
  
  logger.info('Prisma client initialized successfully')
} catch (error: any) {
  logger.error('Failed to initialize Prisma client', {
    error: error.message,
    stack: error.stack
  })
  throw error
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - startTime
    
    logger.debug('Database health check passed', { latency })
    
    return {
      healthy: true,
      latency
    }
  } catch (error: any) {
    const latency = Date.now() - startTime
    
    logger.error('Database health check failed', {
      error: error.message,
      latency
    })
    
    return {
      healthy: false,
      latency,
      error: error.message
    }
  }
}

// Database connection retry wrapper
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  context: string = 'database-operation'
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries})`, {
        context,
        error: error.message,
        attempt
      })

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  logger.error(`Database operation failed after ${maxRetries} attempts`, {
    context,
    error: lastError.message,
    maxRetries
  })

  throw new Error(`Database operation failed after ${maxRetries} attempts: ${lastError.message}`)
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    logger.info('Application shutting down - disconnecting database')
    await prisma.$disconnect()
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received - disconnecting database')
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received - disconnecting database')
    await prisma.$disconnect()
    process.exit(0)
  })
}

export { prisma }
