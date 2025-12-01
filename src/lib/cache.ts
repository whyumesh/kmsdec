// Simple in-memory cache with TTL for API responses
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 1000 // Maximum number of items in cache

  set<T>(key: string, data: T, ttl: number = 300000): void { // Default 5 minutes
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.cache.size,
      active,
      expired
    }
  }
}

// Create singleton instance
export const cache = new MemoryCache()

// Cache key generators
export const CacheKeys = {
  // Admin dashboard
  adminDashboard: 'admin_dashboard',
  adminCandidates: (zoneId?: string) => `admin_candidates_${zoneId || 'all'}`,
  adminVoters: (page?: number) => `admin_voters_${page || 1}`,
  adminResults: 'admin_results',
  
  // Election data
  trustees: (zoneId?: string) => `trustees_${zoneId || 'all'}`,
  karobariCandidates: (zoneId?: string) => `karobari_candidates_${zoneId || 'all'}`,
  yuvaPankCandidates: (zoneId?: string) => `yuva_pank_candidates_${zoneId || 'all'}`,
  
  // Voter data
  voterMe: (voterId: string) => `voter_me_${voterId}`,
  voterDashboard: (voterId: string) => `voter_dashboard_${voterId}`,
  
  // Candidate data
  candidateDashboard: (userId: string) => `candidate_dashboard_${userId}`,
  candidateNomination: (userId: string) => `candidate_nomination_${userId}`,
} as const

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 30000,    // 30 seconds
  MEDIUM: 300000,  // 5 minutes
  LONG: 1800000,   // 30 minutes
  VERY_LONG: 3600000, // 1 hour
} as const

// Helper function to create cache key with parameters
export function createCacheKey(baseKey: string, ...params: (string | number | undefined)[]): string {
  const validParams = params.filter(p => p !== undefined && p !== null)
  return validParams.length > 0 ? `${baseKey}_${validParams.join('_')}` : baseKey
}
