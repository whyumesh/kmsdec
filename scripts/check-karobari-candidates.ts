import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCandidates() {
  const candidates = await prisma.karobariCandidate.findMany({
    include: {
      zone: {
        select: {
          code: true,
          name: true
        }
      }
    },
    orderBy: {
      zoneId: 'asc'
    }
  })
  
  console.log(`\n📊 Total Karobari Candidates in Database: ${candidates.length}\n`)
  console.log('=' .repeat(80))
  
  // Group by zone
  const byZone = new Map<string, typeof candidates>()
  
  for (const candidate of candidates) {
    const zoneCode = candidate.zone?.code || 'NO_ZONE'
    if (!byZone.has(zoneCode)) {
      byZone.set(zoneCode, [])
    }
    byZone.get(zoneCode)!.push(candidate)
  }
  
  for (const [zoneCode, zoneCandidates] of Array.from(byZone.entries()).sort()) {
    console.log(`\n📍 Zone: ${zoneCode} (${zoneCandidates.length} candidates)`)
    zoneCandidates.forEach(c => {
      console.log(`   - ${c.name} (Status: ${c.status})`)
    })
  }
  
  console.log('\n' + '=' .repeat(80))
}

checkCandidates()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

