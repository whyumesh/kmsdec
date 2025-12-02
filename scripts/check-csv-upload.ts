import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

// Load environment variables
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    })
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const prisma = new PrismaClient()

async function checkVoters() {
  const count = await prisma.voter.count()
  console.log(`\n📊 Current voter count in database: ${count}`)
  
  // Check by region
  const byRegion = await prisma.voter.groupBy({
    by: ['region'],
    _count: true
  })
  
  console.log('\n📊 Voters by region:')
  byRegion.forEach(item => {
    console.log(`   ${item.region || 'null'}: ${item._count}`)
  })
  
  // Check by zone
  const byZone = await prisma.voter.groupBy({
    by: ['zoneId'],
    _count: true
  })
  
  console.log('\n📊 Voters by zone:')
  for (const item of byZone) {
    if (item.zoneId) {
      const zone = await prisma.zone.findUnique({
        where: { id: item.zoneId },
        select: { name: true, code: true }
      })
      console.log(`   ${zone?.name || zone?.code || item.zoneId}: ${item._count}`)
    }
  }
  
  await prisma.$disconnect()
}

checkVoters().catch(console.error)

