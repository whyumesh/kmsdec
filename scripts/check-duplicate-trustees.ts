import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDuplicateTrustees() {
  console.log('🔍 Checking for duplicate trustee candidates...\n')
  
  // Get all approved trustee candidates
  const trustees = await prisma.trusteeCandidate.findMany({
    where: { status: 'APPROVED' },
    include: {
      zone: true,
      user: true
    },
    orderBy: [
      { zone: { name: 'asc' } },
      { name: 'asc' }
    ]
  })
  
  console.log(`📊 Total approved trustee candidates: ${trustees.length}\n`)
  
  // Check for duplicates by ID (shouldn't happen, but check anyway)
  const ids = trustees.map(t => t.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    console.log(`⚠️  Found ${duplicateIds.length} duplicate IDs:`, duplicateIds)
  }
  
  // Check for duplicates by name + zone combination
  const nameZoneMap = new Map<string, any[]>()
  trustees.forEach(trustee => {
    const key = `${trustee.name}_${trustee.zoneId || 'no-zone'}`
    if (!nameZoneMap.has(key)) {
      nameZoneMap.set(key, [])
    }
    nameZoneMap.get(key)!.push(trustee)
  })
  
  const duplicates: Array<{ key: string; count: number; trustees: any[] }> = []
  nameZoneMap.forEach((trusteesList, key) => {
    if (trusteesList.length > 1) {
      duplicates.push({ key, count: trusteesList.length, trustees: trusteesList })
    }
  })
  
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate name+zone combinations:\n`)
    duplicates.forEach((dup, i) => {
      console.log(`${i + 1}. ${dup.key} (${dup.count} entries):`)
      dup.trustees.forEach((t, j) => {
        console.log(`   ${j + 1}. ID: ${t.id}, Name: ${t.name}, Zone: ${t.zone?.name || 'No zone'}, Status: ${t.status}`)
      })
      console.log()
    })
  } else {
    console.log('✅ No duplicates found by name+zone combination')
  }
  
  // Check for duplicates by user ID
  const userIdMap = new Map<string, any[]>()
  trustees.forEach(trustee => {
    if (trustee.userId) {
      if (!userIdMap.has(trustee.userId)) {
        userIdMap.set(trustee.userId, [])
      }
      userIdMap.get(trustee.userId)!.push(trustee)
    }
  })
  
  const userDuplicates: Array<{ userId: string; count: number; trustees: any[] }> = []
  userIdMap.forEach((trusteesList, userId) => {
    if (trusteesList.length > 1) {
      userDuplicates.push({ userId, count: trusteesList.length, trustees: trusteesList })
    }
  })
  
  if (userDuplicates.length > 0) {
    console.log(`\n⚠️  Found ${userDuplicates.length} duplicate user IDs:\n`)
    userDuplicates.forEach((dup, i) => {
      console.log(`${i + 1}. User ID: ${dup.userId} (${dup.count} entries):`)
      dup.trustees.forEach((t, j) => {
        console.log(`   ${j + 1}. ID: ${t.id}, Name: ${t.name}, Zone: ${t.zone?.name || 'No zone'}`)
      })
      console.log()
    })
  } else {
    console.log('✅ No duplicates found by user ID')
  }
  
  // Group by zone to see distribution
  const zoneMap = new Map<string, number>()
  trustees.forEach(trustee => {
    const zoneName = trustee.zone?.name || 'No zone'
    zoneMap.set(zoneName, (zoneMap.get(zoneName) || 0) + 1)
  })
  
  console.log('\n📊 Trustees by zone:')
  zoneMap.forEach((count, zone) => {
    console.log(`   ${zone}: ${count} trustees`)
  })
}

checkDuplicateTrustees()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



