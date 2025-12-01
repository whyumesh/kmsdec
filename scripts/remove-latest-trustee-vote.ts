import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeLatestTrusteeVote() {
  console.log('🗑️  Finding and removing the latest trustee vote...\n')
  
  try {
    // Find the most recent trustee vote
    const latestVote = await prisma.vote.findFirst({
      where: {
        trusteeCandidateId: { not: null }
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            voterId: true
          }
        },
        trusteeCandidate: {
          include: {
            zone: {
              select: {
                name: true,
                nameGujarati: true
              }
            }
          }
        }
      }
    })

    if (!latestVote) {
      console.log('✅ No trustee votes found. Nothing to remove.')
      await prisma.$disconnect()
      return
    }

    console.log('📋 Latest trustee vote found:')
    console.log(`   Voter: ${latestVote.voter.name} (${latestVote.voter.voterId})`)
    console.log(`   Trustee: ${latestVote.trusteeCandidate?.name || 'Unknown'}`)
    console.log(`   Zone: ${latestVote.trusteeCandidate?.zone?.name || 'Unknown'}`)
    console.log(`   Timestamp: ${latestVote.timestamp}`)
    console.log(`   Vote ID: ${latestVote.id}`)

    // Delete this vote
    await prisma.vote.delete({
      where: {
        id: latestVote.id
      }
    })

    console.log(`\n✅ Successfully deleted the latest trustee vote`)

    // Check if voter has any other votes
    const remainingVotes = await prisma.vote.count({
      where: { voterId: latestVote.voterId }
    })

    // Check if voter has any other trustee votes
    const remainingTrusteeVotes = await prisma.vote.count({
      where: { 
        voterId: latestVote.voterId,
        trusteeCandidateId: { not: null }
      }
    })

    if (remainingVotes === 0) {
      // Reset hasVoted flag if no votes remain
      await prisma.voter.update({
        where: { id: latestVote.voterId },
        data: { hasVoted: false }
      })
      console.log('✅ Reset hasVoted flag (no votes remaining)')
    } else if (remainingTrusteeVotes === 0) {
      console.log(`ℹ️  Voter still has ${remainingVotes} other vote(s) - hasVoted flag not reset`)
      console.log('✅ All trustee votes removed for this voter')
    } else {
      console.log(`ℹ️  Voter still has ${remainingTrusteeVotes} other trustee vote(s)`)
    }

    console.log('\n✅ Latest trustee vote removal completed successfully!')

  } catch (error: any) {
    console.error('\n❌ Error removing latest trustee vote:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
removeLatestTrusteeVote()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

