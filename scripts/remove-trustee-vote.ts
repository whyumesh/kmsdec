import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeTrusteeVote() {
  console.log('🗑️  Removing trustee test vote...\n')
  
  try {
    // Get voter ID from command line argument or prompt
    const voterId = process.argv[2]
    
    if (!voterId) {
      console.error('❌ Error: Please provide voter ID as argument')
      console.log('Usage: tsx scripts/remove-trustee-vote.ts <voterId>')
      console.log('\nTo find your voter ID:')
      console.log('1. Check the database voters table')
      console.log('2. Or use your voterId (the unique voter number)')
      process.exit(1)
    }

    // Find the voter
    const voter = await prisma.voter.findFirst({
      where: {
        OR: [
          { id: voterId },
          { voterId: voterId }
        ]
      },
      include: {
        votes: {
          where: {
            trusteeCandidateId: { not: null }
          }
        }
      }
    })

    if (!voter) {
      console.error(`❌ Voter not found with ID: ${voterId}`)
      process.exit(1)
    }

    console.log(`📋 Found voter: ${voter.name} (${voter.voterId})`)
    console.log(`📊 Trustee votes found: ${voter.votes.length}`)

    if (voter.votes.length === 0) {
      console.log('✅ No trustee votes found. Nothing to remove.')
      await prisma.$disconnect()
      return
    }

    // Show votes to be deleted
    console.log('\n🗑️  Votes to be deleted:')
    for (const vote of voter.votes) {
      const trustee = await prisma.trusteeCandidate.findUnique({
        where: { id: vote.trusteeCandidateId! },
        include: { zone: true }
      })
      console.log(`   - Vote ID: ${vote.id}`)
      console.log(`     Trustee: ${trustee?.name || 'Unknown'}`)
      console.log(`     Zone: ${trustee?.zone?.name || 'Unknown'}`)
      console.log(`     Timestamp: ${vote.timestamp}`)
    }

    // Delete all trustee votes for this voter
    const deletedVotes = await prisma.vote.deleteMany({
      where: {
        voterId: voter.id,
        trusteeCandidateId: { not: null }
      }
    })

    console.log(`\n✅ Successfully deleted ${deletedVotes.count} trustee vote(s)`)

    // Check if voter has any other votes
    const remainingVotes = await prisma.vote.count({
      where: { voterId: voter.id }
    })

    if (remainingVotes === 0) {
      // Reset hasVoted flag if no votes remain
      await prisma.voter.update({
        where: { id: voter.id },
        data: { hasVoted: false }
      })
      console.log('✅ Reset hasVoted flag (no votes remaining)')
    } else {
      console.log(`ℹ️  Voter still has ${remainingVotes} other vote(s) - hasVoted flag not reset`)
    }

    console.log('\n✅ Trustee vote removal completed successfully!')

  } catch (error: any) {
    console.error('\n❌ Error removing trustee vote:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
removeTrusteeVote()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

