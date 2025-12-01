import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAnjarWinner() {
  const anjarZone = await prisma.zone.findFirst({
    where: { code: 'ANJAR', electionType: 'KAROBARI_MEMBERS' }
  })
  
  if (anjarZone) {
    const winner = await prisma.karobariCandidate.findFirst({
      where: { zoneId: anjarZone.id, status: 'APPROVED' },
      select: { name: true, email: true, phone: true, region: true }
    })
    
    console.log('\n🏆 Anjar Zone Winner for Karobari Samiti 2026-2029:\n')
    console.log('Name:', winner?.name || 'Not found')
    console.log('Region:', winner?.region || 'N/A')
    console.log('Email:', winner?.email || 'N/A')
    console.log('Phone:', winner?.phone || 'N/A')
  } else {
    console.log('Anjar zone not found')
  }
  
  await prisma.$disconnect()
}

checkAnjarWinner()

