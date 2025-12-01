import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTrusteeElectionAgeLimit() {
  console.log('🔧 Updating Trustees election age limit to 18+...\n')
  
  try {
    // Find the Trustees election
    const election = await prisma.election.findFirst({
      where: { type: 'TRUSTEES' }
    })
    
    if (!election) {
      console.log('❌ Trustees election not found in database')
      return
    }
    
    console.log(`📋 Current election settings:`)
    console.log(`   Title: ${election.title}`)
    console.log(`   Voter Min Age: ${election.voterMinAge ?? 'null (no limit)'}`)
    console.log(`   Voter Max Age: ${election.voterMaxAge ?? 'null (no limit)'}`)
    console.log(`   Candidate Min Age: ${election.candidateMinAge ?? 'null'}`)
    console.log()
    
    // Update the election to set voterMinAge to 18
    const updated = await prisma.election.update({
      where: { id: election.id },
      data: {
        voterMinAge: 18
      }
    })
    
    console.log('✅ Election updated successfully!')
    console.log(`📋 Updated election settings:`)
    console.log(`   Title: ${updated.title}`)
    console.log(`   Voter Min Age: ${updated.voterMinAge} years`)
    console.log(`   Voter Max Age: ${updated.voterMaxAge ?? 'null (no limit)'}`)
    console.log(`   Candidate Min Age: ${updated.candidateMinAge ?? 'null'}`)
    console.log()
    console.log('✅ Trustees election now requires voters to be at least 18 years old')
    
  } catch (error) {
    console.error('❌ Error updating election:', error)
    throw error
  }
}

updateTrusteeElectionAgeLimit()
  .then(() => {
    console.log('\n✅ Completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



