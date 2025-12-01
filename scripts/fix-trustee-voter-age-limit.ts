import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixTrusteeVoterAgeLimit() {
  console.log('🔧 Fixing Trustee election voter age limit...\n')

  try {
    // Update the Trustees election to allow all ages (remove 18+ requirement)
    const updated = await prisma.election.update({
      where: { id: 'trustees-2024' },
      data: {
        voterMinAge: null, // All ages can vote
        voterMaxAge: null
      }
    })

    console.log('✅ Successfully updated Trustees election:')
    console.log(`   - Voter Min Age: ${updated.voterMinAge ?? 'None (All ages)'}`)
    console.log(`   - Voter Max Age: ${updated.voterMaxAge ?? 'None'}`)
    console.log(`   - Candidate Min Age: ${updated.candidateMinAge}`)
    console.log(`   - Candidate Max Age: ${updated.candidateMaxAge ?? 'None'}`)
    console.log(`   - Voter Jurisdiction: ${updated.voterJurisdiction}`)
    console.log(`   - Candidate Jurisdiction: ${updated.candidateJurisdiction}`)
    
    console.log('\n📋 Summary of all election age limits:')
    
    const elections = await prisma.election.findMany({
      orderBy: { type: 'asc' }
    })

    elections.forEach(election => {
      console.log(`\n${election.title}:`)
      console.log(`   Voters: ${election.voterMinAge ? `${election.voterMinAge}+` : 'All ages'} ${election.voterMaxAge ? `up to ${election.voterMaxAge}` : ''}`)
      console.log(`   Candidates: ${election.candidateMinAge ? `${election.candidateMinAge}+` : 'All ages'} ${election.candidateMaxAge ? `up to ${election.candidateMaxAge}` : ''}`)
    })

  } catch (error) {
    console.error('❌ Error updating Trustee election:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixTrusteeVoterAgeLimit()
  .then(() => {
    console.log('\n✅ Fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  })



