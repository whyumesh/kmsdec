import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

// Load environment variables from .env.local
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    })
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

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



