/**
 * Script to activate Karobari Members election
 * Run with: npx tsx scripts/activate-karobari-election.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function activateKarobariElection() {
  try {
    console.log('Activating Karobari Members election...')

    const election = await prisma.election.findFirst({
      where: { type: 'KAROBARI_MEMBERS' }
    })

    if (!election) {
      console.error('Karobari Members election not found!')
      process.exit(1)
    }

    console.log(`Found election: ${election.title} (Status: ${election.status})`)

    const updatedElection = await prisma.election.update({
      where: { id: election.id },
      data: { status: 'ACTIVE' }
    })

    console.log(`✅ Successfully activated Karobari Members election!`)
    console.log(`   Election ID: ${updatedElection.id}`)
    console.log(`   New Status: ${updatedElection.status}`)
    console.log(`   Start Date: ${updatedElection.startDate}`)
    console.log(`   End Date: ${updatedElection.endDate}`)
  } catch (error) {
    console.error('Error activating election:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

activateKarobariElection()

