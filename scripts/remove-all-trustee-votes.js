// Use the same database URL as in db.ts
const databaseUrl = "postgresql://neondb_owner:npg_S8lUFoJtxCj6@ep-dry-paper-a1fgokjj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

async function removeAllTrusteeVotes() {
  try {
    console.log('Finding voter and removing ALL trustee votes...\n')
    
    // Find the voter
    const voter = await prisma.voter.findFirst({
      where: {
        voterId: 'VID2398'
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
      console.log('❌ Voter not found')
      return
    }

    console.log(`Found voter: ${voter.name} (${voter.voterId})`)
    console.log(`Trustee votes found: ${voter.votes.length}`)

    if (voter.votes.length === 0) {
      console.log('✅ No trustee votes found. Nothing to remove.')
      return
    }

    // Show all votes to be deleted
    console.log('\n🗑️  Votes to be deleted:')
    for (const vote of voter.votes) {
      const trustee = await prisma.trusteeCandidate.findUnique({
        where: { id: vote.trusteeCandidateId },
        include: { zone: true }
      })
      console.log(`   - Vote ID: ${vote.id}`)
      console.log(`     Trustee: ${trustee?.name || 'Unknown'}`)
      console.log(`     Zone: ${trustee?.zone?.name || 'Unknown'}`)
      console.log(`     Timestamp: ${vote.timestamp}`)
    }

    // Delete ALL trustee votes for this voter
    const deletedVotes = await prisma.vote.deleteMany({
      where: {
        voterId: voter.id,
        trusteeCandidateId: { not: null }
      }
    })

    console.log(`\n✅ Successfully deleted ${deletedVotes.count} trustee vote(s)`)

    // Check if voter has any other votes (non-trustee)
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

    // Verify
    const updatedVoter = await prisma.voter.findUnique({
      where: { id: voter.id },
      include: {
        votes: {
          where: {
            trusteeCandidateId: { not: null }
          }
        }
      }
    })
    
    console.log(`\n✅ Verification:`)
    console.log(`   Remaining trustee votes: ${updatedVoter.votes.length}`)
    console.log(`   hasVoted status: ${updatedVoter.hasVoted}`)

    console.log('\n✅ All trustee votes removed successfully!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeAllTrusteeVotes()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

