/**
 * Script to freeze Karobari Members election
 * Run with: npx tsx scripts/freeze-karobari-election.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function freezeKarobariElection() {
  try {
    console.log('Freezing Karobari Members election...')

    const election = await prisma.election.findFirst({
      where: { type: 'KAROBARI_MEMBERS' }
    })

    if (!election) {
      console.error('Karobari Members election not found!')
      process.exit(1)
    }

    console.log(`Found election: ${election.title} (Status: ${election.status})`)

    // Set status to UPCOMING to freeze it (voting requires ACTIVE status)
    const updatedElection = await prisma.election.update({
      where: { id: election.id },
      data: { status: 'UPCOMING' }
    })

    console.log(`✅ Successfully froze Karobari Members election!`)
    console.log(`   Election ID: ${updatedElection.id}`)
    console.log(`   New Status: ${updatedElection.status}`)
    console.log(`   Voting is now BLOCKED for this election`)
  } catch (error) {
    console.error('Error freezing election:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

freezeKarobariElection()

