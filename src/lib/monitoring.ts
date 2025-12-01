import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

interface MonitoringConfig {
  alerts: {
    enabled: boolean
    webhook?: string
    email?: string
  }
  metrics: {
    responseTimeThreshold: number
    errorRateThreshold: number
    memoryThreshold: number
  }
  checks: {
    database: boolean
    storage: boolean
    externalServices: boolean
    performance: boolean
  }
}

export const monitoringConfig: MonitoringConfig = {
  alerts: {
    enabled: process.env.NODE_ENV === 'production',
    webhook: process.env.MONITORING_WEBHOOK_URL,
    email: process.env.MONITORING_EMAIL
  },
  metrics: {
    responseTimeThreshold: 1000, // 1 second
    errorRateThreshold: 0.05, // 5%
    memoryThreshold: 90 // 90%
  },
  checks: {
    database: true,
    storage: true,
    externalServices: true,
    performance: true
  }
}

export class MonitoringService {
  private static instance: MonitoringService
  private metrics: Map<string, any> = new Map()
  
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }
  
  recordMetric(key: string, value: any, context?: any) {
    this.metrics.set(key, {
      value,
      timestamp: new Date().toISOString(),
      context
    })
    
    // Log important metrics
    if (monitoringConfig.alerts.enabled) {
      this.checkThresholds(key, value)
    }
  }
  
  private checkThresholds(key: string, value: any) {
    const config = monitoringConfig.metrics
    
    switch (key) {
      case 'responseTime':
        if (value > config.responseTimeThreshold) {
          this.sendAlert('High Response Time', {
            metric: key,
            value,
            threshold: config.responseTimeThreshold
          })
        }
        break
        
      case 'errorRate':
        if (value > config.errorRateThreshold) {
          this.sendAlert('High Error Rate', {
            metric: key,
            value,
            threshold: config.errorRateThreshold
          })
        }
        break
        
      case 'memoryUsage':
        if (value > config.memoryThreshold) {
          this.sendAlert('High Memory Usage', {
            metric: key,
            value,
            threshold: config.memoryThreshold
          })
        }
        break
    }
  }
  
  private async sendAlert(title: string, data: any) {
    logger.warn(`Monitoring Alert: ${title}`, data)
    
    // Send webhook notification if configured
    if (monitoringConfig.alerts.webhook) {
      try {
        await fetch(monitoringConfig.alerts.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            data,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
          })
        })
      } catch (error) {
        logger.error('Failed to send monitoring alert', { error })
      }
    }
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics)
  }
  
  clearMetrics() {
    this.metrics.clear()
  }
}

// Middleware for automatic request monitoring
export function withMonitoring(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now()
    const monitoring = MonitoringService.getInstance()
    
    try {
      const response = await handler(request, ...args)
      const responseTime = Date.now() - startTime
      
      monitoring.recordMetric('responseTime', responseTime, {
        method: request.method,
        path: request.nextUrl.pathname,
        status: response?.status || 200
      })
      
      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      monitoring.recordMetric('errorRate', 1, {
        method: request.method,
        path: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })
      
      throw error
    }
  }
}

