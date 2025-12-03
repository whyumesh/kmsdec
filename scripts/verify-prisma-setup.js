#!/usr/bin/env node

/**
 * Verify Prisma Client Setup
 * This script checks if Prisma Client is properly generated with the correct binary targets
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Verifying Prisma Client setup...\n')

// Check if Prisma Client exists
const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client')
if (!fs.existsSync(prismaClientPath)) {
  console.error('❌ Prisma Client not found. Run: npx prisma generate')
  process.exit(1)
}

// Check schema.prisma for binary targets
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
if (!fs.existsSync(schemaPath)) {
  console.error('❌ schema.prisma not found')
  process.exit(1)
}

const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
if (!schemaContent.includes('rhel-openssl-3.0.x')) {
  console.error('❌ schema.prisma does not include rhel-openssl-3.0.x binary target')
  console.error('   Add: binaryTargets = ["native", "rhel-openssl-3.0.x"] to generator client')
  process.exit(1)
}

console.log('✅ Schema includes rhel-openssl-3.0.x binary target')

// Check if binary exists (check multiple possible names)
const binaryPaths = [
  path.join(prismaClientPath, 'libquery_engine-rhel-openssl-3.0.x.node'),
  path.join(prismaClientPath, 'libquery_engine-rhel-openssl-3.0.x.so'),
  path.join(prismaClientPath, 'libquery_engine-rhel-openssl-3.0.x.so.node')
]

const foundBinary = binaryPaths.find(p => fs.existsSync(p))
if (!foundBinary) {
  console.warn('⚠️  rhel-openssl-3.0.x binary not found in Prisma Client')
  console.warn('   Run: npx prisma generate')
  console.warn('   This binary is required for Netlify deployment')
} else {
  console.log(`✅ rhel-openssl-3.0.x binary found: ${path.basename(foundBinary)}`)
}

// Check @prisma/engines
const enginesPath = path.join(process.cwd(), 'node_modules', '@prisma', 'engines')
if (fs.existsSync(enginesPath)) {
  const enginesFiles = fs.readdirSync(enginesPath, { recursive: true })
  const rhelEngine = enginesFiles.find(f => f.includes('rhel-openssl-3.0.x'))
  if (rhelEngine) {
    console.log('✅ rhel-openssl-3.0.x engine found in @prisma/engines')
  } else {
    console.warn('⚠️  rhel-openssl-3.0.x engine not found in @prisma/engines')
  }
}

console.log('\n✅ Prisma Client setup verification complete!')
console.log('   If deploying to Netlify, ensure the binary is included in the deployment.')

