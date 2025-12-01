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

async function resetVoterStatus() {
  try {
    console.log('Checking voter status...\n')
    
    // Find the voter who just had their vote removed (Parth Piyush Gagdani)
    const voter = await prisma.voter.findFirst({
      where: {
        voterId: 'VID2398'
      },
      include: {
        votes: true
      }
    })

    if (!voter) {
      console.log('❌ Voter not found')
      return
    }

    console.log(`Found voter: ${voter.name} (${voter.voterId})`)
    console.log(`Current hasVoted status: ${voter.hasVoted}`)
    console.log(`Total votes: ${voter.votes.length}`)
    
    // Check trustee votes specifically
    const trusteeVotes = voter.votes.filter(v => v.trusteeCandidateId !== null)
    console.log(`Trustee votes: ${trusteeVotes.length}`)

    if (voter.votes.length === 0 && voter.hasVoted) {
      console.log('\n🔄 Resetting hasVoted flag...')
      await prisma.voter.update({
        where: { id: voter.id },
        data: { hasVoted: false }
      })
      console.log('✅ hasVoted flag reset to false')
    } else if (trusteeVotes.length === 0 && voter.hasVoted) {
      console.log('\n🔄 Resetting hasVoted flag (no trustee votes remaining)...')
      await prisma.voter.update({
        where: { id: voter.id },
        data: { hasVoted: false }
      })
      console.log('✅ hasVoted flag reset to false')
    } else {
      console.log('\nℹ️  Voter status is correct')
      if (voter.votes.length > 0) {
        console.log(`   Voter still has ${voter.votes.length} other vote(s)`)
      }
    }

    // Verify
    const updatedVoter = await prisma.voter.findUnique({
      where: { id: voter.id },
      select: { hasVoted: true }
    })
    console.log(`\n✅ Updated hasVoted status: ${updatedVoter.hasVoted}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetVoterStatus()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

