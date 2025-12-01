#!/usr/bin/env node

/**
 * Database Maintenance Script
 * 
 * This script handles:
 * - Database backups
 * - Performance monitoring
 * - Cleanup operations
 * - Health checks
 * 
 * Usage:
 *   npm run db:maintenance
 *   npm run db:backup
 *   npm run db:cleanup
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '../src/lib/db'
import { logger } from '../src/lib/logger'

const BACKUP_DIR = './backups'
const MAX_BACKUPS = 7 // Keep 7 days of backups

interface MaintenanceOptions {
  backup?: boolean
  cleanup?: boolean
  healthCheck?: boolean
  performanceCheck?: boolean
}

class DatabaseMaintenance {
  private backupDir: string

  constructor() {
    this.backupDir = BACKUP_DIR
    this.ensureBackupDir()
  }

  private ensureBackupDir() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = join(this.backupDir, `backup-${timestamp}.db`)
    
    try {
      logger.info('Starting database backup', { backupFile })
      
      // For SQLite, we can simply copy the file
      if (process.env.DATABASE_URL?.startsWith('file:')) {
        const dbPath = process.env.DATABASE_URL.replace('file:', '')
        execSync(`cp "${dbPath}" "${backupFile}"`)
      } else {
        // For PostgreSQL, use pg_dump
        const dbUrl = process.env.DATABASE_URL
        if (!dbUrl) {
          throw new Error('DATABASE_URL not configured')
        }
        
        execSync(`pg_dump "${dbUrl}" > "${backupFile}"`)
      }
      
      logger.info('Database backup completed', { backupFile })
      return backupFile
      
    } catch (error) {
      logger.error('Database backup failed', { error, backupFile })
      throw error
    }
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      logger.info('Starting backup cleanup')
      
      const files = execSync(`ls -t "${this.backupDir}"/*.db 2>/dev/null || true`)
        .toString()
        .trim()
        .split('\n')
        .filter(f => f.length > 0)
      
      if (files.length > MAX_BACKUPS) {
        const filesToDelete = files.slice(MAX_BACKUPS)
        
        for (const file of filesToDelete) {
          execSync(`rm "${file}"`)
          logger.info('Deleted old backup', { file })
        }
        
        logger.info('Backup cleanup completed', { 
          deleted: filesToDelete.length,
          remaining: files.length - filesToDelete.length
        })
      } else {
        logger.info('No old backups to clean up', { totalBackups: files.length })
      }
      
    } catch (error) {
      logger.error('Backup cleanup failed', { error })
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      logger.info('Starting database health check')
      
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`
      
      // Check table integrity
      const tableCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
      `
      
      // Check for any obvious data issues
      const voterCount = await prisma.voter.count()
      const karobariCandidateCount = await prisma.karobariCandidate.count()
      const trusteeCandidateCount = await prisma.trusteeCandidate.count()
      const yuvaPankhCandidateCount = await prisma.yuvaPankhCandidate.count()
      const voteCount = await prisma.vote.count()
      
      logger.info('Database health check passed', {
        tables: (tableCount as any)[0]?.count || 0,
        voters: voterCount,
        karobariCandidates: karobariCandidateCount,
        trusteeCandidates: trusteeCandidateCount,
        yuvaPankhCandidates: yuvaPankhCandidateCount,
        votes: voteCount
      })
      
      return true
      
    } catch (error) {
      logger.error('Database health check failed', { error })
      return false
    }
  }

  async performanceCheck(): Promise<void> {
    try {
      logger.info('Starting database performance check')
      
      const startTime = Date.now()
      
      // Test query performance
      await Promise.all([
        prisma.voter.count(),
        prisma.karobariCandidate.count(),
        prisma.trusteeCandidate.count(),
        prisma.yuvaPankhCandidate.count(),
        prisma.vote.count()
      ])
      
      const queryTime = Date.now() - startTime
      
      logger.info('Database performance check completed', {
        queryTime: `${queryTime}ms`,
        status: queryTime < 1000 ? 'good' : 'slow'
      })
      
    } catch (error) {
      logger.error('Database performance check failed', { error })
      throw error
    }
  }

  async runMaintenance(options: MaintenanceOptions): Promise<void> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting database maintenance', options)
      
      if (options.healthCheck) {
        const healthy = await this.healthCheck()
        if (!healthy) {
          throw new Error('Database health check failed')
        }
      }
      
      if (options.backup) {
        await this.createBackup()
      }
      
      if (options.performanceCheck) {
        await this.performanceCheck()
      }
      
      if (options.cleanup) {
        await this.cleanupOldBackups()
      }
      
      const totalTime = Date.now() - startTime
      logger.info('Database maintenance completed', { 
        totalTime: `${totalTime}ms`,
        operations: Object.keys(options).filter(k => options[k as keyof MaintenanceOptions])
      })
      
    } catch (error) {
      logger.error('Database maintenance failed', { error })
      throw error
    } finally {
      await prisma.$disconnect()
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: MaintenanceOptions = {}
  
  if (args.includes('--backup')) options.backup = true
  if (args.includes('--cleanup')) options.cleanup = true
  if (args.includes('--health')) options.healthCheck = true
  if (args.includes('--performance')) options.performanceCheck = true
  
  // Default to all operations if no specific options provided
  if (Object.keys(options).length === 0) {
    options.backup = true
    options.cleanup = true
    options.healthCheck = true
    options.performanceCheck = true
  }
  
  const maintenance = new DatabaseMaintenance()
  
  try {
    await maintenance.runMaintenance(options)
    process.exit(0)
  } catch (error) {
    console.error('Maintenance failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { DatabaseMaintenance }
