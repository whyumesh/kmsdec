import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixZones() {
  // Fix Deepak Kishor Karwa - should be in MUMBAI, not GARADA
  const mumbaiZone = await prisma.zone.findFirst({
    where: { code: 'MUMBAI', electionType: 'KAROBARI_MEMBERS' }
  })
  
  const candidate = await prisma.karobariCandidate.findFirst({
    where: { name: { contains: 'Deepak Kishor Karwa' } }
  })
  
  if (candidate && mumbaiZone) {
    await prisma.karobariCandidate.update({
      where: { id: candidate.id },
      data: { zoneId: mumbaiZone.id }
    })
    console.log('✅ Fixed: Deepak Kishor Karwa moved to MUMBAI zone')
  }
  
  await prisma.$disconnect()
}

fixZones()

