// Database configuration for different environments
export const getDatabaseConfig = () => {
  // Use environment variable or default to SQLite for development
  const baseUrl = process.env.DATABASE_URL || "file:./dev.db"
  
  // For SQLite, return simple config
  if (baseUrl.startsWith('file:')) {
    return {
      url: baseUrl,
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error'],
    }
  }

  // Parse the URL to add connection parameters for PostgreSQL
  const url = new URL(baseUrl)
  
  // Add connection pooling parameters for production
  if (process.env.NODE_ENV === 'production') {
    url.searchParams.set('connection_limit', '10') // Increased from 1 to 10
    url.searchParams.set('pool_timeout', '60') // Increased timeout
    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('prepared_statements', 'true') // Enable prepared statements for better performance
    url.searchParams.set('connect_timeout', '10') // Connection timeout
    url.searchParams.set('idle_in_transaction_session_timeout', '300000') // 5 minutes
  }

  return {
    url: url.toString(),
    // Additional Prisma configuration
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  }
}
