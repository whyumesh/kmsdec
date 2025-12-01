// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, { start: number; end?: number; duration?: number }> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(label: string): void {
    this.metrics.set(label, { start: Date.now() })
  }

  endTimer(label: string): number | null {
    const metric = this.metrics.get(label)
    if (!metric) {
      console.warn(`Timer '${label}' was not started`)
      return null
    }

    const end = Date.now()
    const duration = end - metric.start
    metric.end = end
    metric.duration = duration

    console.log(`⏱️  ${label}: ${duration}ms`)
    return duration
  }

  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [label, metric] of this.metrics.entries()) {
      if (metric.duration !== undefined) {
        result[label] = metric.duration
      }
    }
    return result
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

// Helper function to measure API performance
export function measureApiPerformance<T>(
  apiName: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startTimer(apiName)
  
  return fn().finally(() => {
    monitor.endTimer(apiName)
  })
}

// Helper function to measure database query performance
export function measureQueryPerformance<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startTimer(`DB_${queryName}`)
  
  return fn().finally(() => {
    monitor.endTimer(`DB_${queryName}`)
  })
}

// Performance decorator for API routes
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  routeName: string
) {
  return async (...args: T): Promise<R> => {
    const monitor = PerformanceMonitor.getInstance()
    monitor.startTimer(`API_${routeName}`)
    
    try {
      const result = await fn(...args)
      monitor.endTimer(`API_${routeName}`)
      return result
    } catch (error) {
      monitor.endTimer(`API_${routeName}`)
      throw error
    }
  }
}

// Database query optimization helpers
export const QueryOptimizations = {
  // Select only necessary fields
  selectMinimal: {
    id: true,
    name: true,
    email: true,
    phone: true,
    status: true,
    createdAt: true,
    updatedAt: true
  },

  // Select user fields only
  selectUser: {
    name: true,
    email: true,
    phone: true
  },

  // Select zone fields only
  selectZone: {
    id: true,
    name: true,
    nameGujarati: true,
    code: true,
    seats: true
  }
} as const

// Batch processing helper
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }
  
  return results
}

// Memory usage monitoring
export function logMemoryUsage(context: string): void {
  if (process.env.NODE_ENV === 'development') {
    const used = process.memoryUsage()
    console.log(`🧠 Memory usage (${context}):`, {
      rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(used.external / 1024 / 1024)} MB`
    })
  }
}
