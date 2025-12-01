import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function wipeAllVoters() {
  console.log('🗑️  Wiping all voter data from database...\n')
  
  try {
    // First, delete all votes (they reference voters)
    console.log('Deleting all votes...')
    const votesDeleted = await prisma.vote.deleteMany({})
    console.log(`   ✓ Deleted ${votesDeleted.count} votes`)
    
    // Delete all voters (this will cascade delete users due to onDelete: Cascade)
    console.log('Deleting all voters...')
    const votersDeleted = await prisma.voter.deleteMany({})
    console.log(`   ✓ Deleted ${votersDeleted.count} voters`)
    
    // Delete orphaned users (if any)
    console.log('Deleting orphaned users...')
    const usersDeleted = await prisma.user.deleteMany({
      where: {
        role: 'VOTER'
      }
    })
    console.log(`   ✓ Deleted ${usersDeleted.count} users`)
    
    console.log('\n✅ All voter data wiped successfully!')
    
    // Verify
    const remainingVoters = await prisma.voter.count()
    const remainingUsers = await prisma.user.count({
      where: { role: 'VOTER' }
    })
    
    console.log(`\n📊 Verification:`)
    console.log(`   Remaining voters: ${remainingVoters}`)
    console.log(`   Remaining voter users: ${remainingUsers}`)
    
    if (remainingVoters === 0 && remainingUsers === 0) {
      console.log('\n✅ Database is clean and ready for new upload!')
    } else {
      console.log('\n⚠️  Warning: Some data may still remain')
    }
    
  } catch (error: any) {
    console.error('\n❌ Error wiping data:', error)
    throw error
  }
}

wipeAllVoters()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  })



