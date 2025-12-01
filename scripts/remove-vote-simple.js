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

async function removeLatestTrusteeVote() {
  try {
    console.log('Finding latest trustee vote...')
    
    const vote = await prisma.vote.findFirst({
      where: {
        trusteeCandidateId: { not: null }
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        voter: {
          select: {
            name: true,
            voterId: true
          }
        }
      }
    })

    if (!vote) {
      console.log('✅ No trustee votes found. Nothing to remove.')
      return
    }

    console.log(`Found vote for: ${vote.voter.name} (${vote.voter.voterId})`)
    console.log(`Vote ID: ${vote.id}`)
    console.log(`Timestamp: ${vote.timestamp}`)

    await prisma.vote.delete({
      where: { id: vote.id }
    })

    console.log('✅ Successfully deleted the latest trustee vote!')

    // Check remaining votes
    const remainingVotes = await prisma.vote.count({
      where: { voterId: vote.voterId }
    })

    if (remainingVotes === 0) {
      await prisma.voter.update({
        where: { id: vote.voterId },
        data: { hasVoted: false }
      })
      console.log('✅ Reset hasVoted flag')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeLatestTrusteeVote()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

