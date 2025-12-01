import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user with hashed password
  const adminPassword = await bcrypt.hash('SecureAdmin123!', 12)
  
  // Check if admin user already exists
  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@kms-election.com' }
  })
  
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@kms-election.com',
        name: 'Election Administrator',
        phone: '+1234567890',
        password: adminPassword,
        role: 'ADMIN',
      },
    })
  }

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      adminId: 'ADMIN001',
    },
  })

  console.log('Admin user created:', adminUser.email)

  // Create Karobari Admins
  const karobariAdmins = [
    {
      email: 'karobari01@kms-election.com',
      name: 'Karobari Admin 01',
      phone: '+919321578416',
      adminId: 'KAROBARI001'
    },
    {
      email: 'karobari02@kms-election.com',
      name: 'Karobari Admin 02',
      phone: '+919321578417',
      adminId: 'KAROBARI002'
    },
    {
      email: 'karobari03@kms-election.com',
      name: 'Karobari Admin 03',
      phone: '+919321578418',
      adminId: 'KAROBARI003'
    },
    {
      email: 'karobari04@kms-election.com',
      name: 'Karobari Admin 04',
      phone: '+919321578419',
      adminId: 'KAROBARI004'
    },
    {
      email: 'karobari05@kms-election.com',
      name: 'Karobari Admin 05',
      phone: '+919321578420',
      adminId: 'KAROBARI005'
    }
  ]

  const karobariAdminPassword = await bcrypt.hash('KarobariAdmin2025!', 12)

  for (const adminData of karobariAdmins) {
    // Check if user already exists (case-insensitive)
    const emailLower = adminData.email.toLowerCase()
    let karobariUser = await prisma.user.findFirst({
      where: { email: emailLower }
    })

    if (!karobariUser) {
      karobariUser = await prisma.user.create({
        data: {
          email: emailLower,
          name: adminData.name,
          phone: adminData.phone,
          password: karobariAdminPassword,
          role: 'KAROBARI_ADMIN',
        },
      })
    } else {
      // Update password if user exists (to ensure it matches current seed password)
      karobariUser = await prisma.user.update({
        where: { id: karobariUser.id },
        data: {
          password: karobariAdminPassword,
          role: 'KAROBARI_ADMIN',
        },
      })
    }

    await prisma.karobariAdmin.upsert({
      where: { userId: karobariUser.id },
      update: {
        name: adminData.name,
        email: emailLower,
        phone: adminData.phone,
      },
      create: {
        userId: karobariUser.id,
        adminId: adminData.adminId,
        name: adminData.name,
        email: emailLower,
        phone: adminData.phone,
      },
    })

    console.log('Karobari admin created:', adminData.email)
  }

  // Create zones for Yuva Pank - Only 2 zones: Karnataka & Goa and Raigad
  const yuvaPankhZones = [
    {
      code: 'RAIGAD',
      name: 'Raigad',
      nameGujarati: 'રાયગઢ',
      description: 'Raigad, Pune, Ratnagiri, Kolhapur, Sangli',
      seats: 3,
      electionType: 'YUVA_PANK'
    },
    {
      code: 'KARNATAKA_GOA',
      name: 'Karnataka & Goa',
      nameGujarati: 'કર્ણાટક અને ગોવા',
      description: 'Karnataka & Goa State',
      seats: 1,
      electionType: 'YUVA_PANK'
    }
  ]

  // Create zones for Karobari Samiti (21 seats)
  const karobariZones = [
    {
      code: 'RAIGAD',
      name: 'Raigad',
      nameGujarati: 'રાયગઢ',
      description: 'Raigad (including Khapdar), Pune, Ratnagiri, Kolhapur, Sangli',
      seats: 4,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'MUMBAI',
      name: 'Mumbai',
      nameGujarati: 'મુંબઈ',
      description: 'Mumbai, Thane, Navi Mumbai, Nashik, Ahmednagar, Nagpur, Chandrapur, Madhya Pradesh, Rajasthan, West Bengal, Odisha, Haryana & Overseas',
      seats: 6,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'KARNATAKA_GOA',
      name: 'Karnataka & Goa',
      nameGujarati: 'કકર્ણાટક અને ગોવા',
      description: 'Karnataka & Goa state',
      seats: 1,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'ABDASA',
      name: 'Abdasa',
      nameGujarati: 'અબડાસા',
      description: 'All villages of Abdasa taluka',
      seats: 1,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'GARADA',
      name: 'Garada',
      nameGujarati: 'ગરડા',
      description: 'Nakhatrana and Lakhpat talukas',
      seats: 2,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'BHUJ',
      name: 'Bhuj',
      nameGujarati: 'ભુજ',
      description: 'Bhuj, Mirzapar, Madhapar (taluka - Bhuj)',
      seats: 3,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'ANJAR',
      name: 'Anjar',
      nameGujarati: 'અંજાર',
      description: 'Anjar, Adipur, Mandvi, Mundra,Gandhidham, Shinoi, Bhadreshwar, Khedoi',
      seats: 1,
      electionType: 'KAROBARI_MEMBERS'
    },
    {
      code: 'ANYA_GUJARAT',
      name: 'Anya Gujarat',
      nameGujarati: 'અન્ય ગુજરાત',
      description: 'Ahmedabad, Valsad, Surat, Vadodara, Ankleshwar, Sachina, Anand, Mehsana, Bharuch, Dahegam, Kapadvanj, Jamnagar, Morbi, Rajkot',
      seats: 3,
      electionType: 'KAROBARI_MEMBERS'
    }
  ]

  // Create zones for Trustees (7 seats total)
  const trusteesZones = [
    {
      code: 'MUMBAI',
      name: 'Mumbai',
      nameGujarati: 'મુંબઈ',
      description: 'Mumbai, Thane, Navi Mumbai, Nashik, Ahmednagar, Nagpur, Chandrapur, Madhya Pradesh, Rajasthan, West Bengal, Odisha, Haryana & Overseas',
      seats: 2,
      electionType: 'TRUSTEES'
    },
    {
      code: 'RAIGAD',
      name: 'Raigad',
      nameGujarati: 'રાયગઢ',
      description: 'Raigad, Pune, Ratnagiri, Kolhapur, Sangli',
      seats: 1,
      electionType: 'TRUSTEES'
    },
    {
      code: 'ABDASA_GARDA',
      name: 'Abdasa & Garda',
      nameGujarati: 'અબડાસા અને ગરડા',
      description: 'Abdasa, Garda, Naliya, Kothara, Tera, Jakhau, Bitta, Dayapar, Mata Na Madh, Ravapar, Ghadani, Nakhatrana, and other villages',
      seats: 1,
      electionType: 'TRUSTEES'
    },
    {
      code: 'KARNATAKA_GOA',
      name: 'Karnataka & Goa',
      nameGujarati: 'કર્ણાટક અને ગોવા',
      description: 'Karnataka & Goa State',
      seats: 1,
      electionType: 'TRUSTEES'
    },
    {
      code: 'ANJAR_ANYA_GUJARAT',
      name: 'Anjar & Anya Gujarat',
      nameGujarati: 'અંજાર અને અન્ય ગુજરાત',
      description: 'Anjar, Mundra, Adipur, Mandvi, Gandhidham, Shinoi, Bhadreshwar, Khedoi, Ahmedabad, Valsad, Surat, Vadodara, Ankleshwar, Sachin, Anand, Mehsana, Bharuch, Dahegam, Kapadvanj, Jamnagar, Morbi, Rajkot',
      seats: 1,
      electionType: 'TRUSTEES'
    },
    {
      code: 'BHUJ',
      name: 'Bhuj',
      nameGujarati: 'ભુજ',
      description: 'Bhuj, Mirzapar, Madhapar (taluka - Bhuj)',
      seats: 1,
      electionType: 'TRUSTEES'
    }
  ]

  // Combine all zones
  const zones = [...yuvaPankhZones, ...karobariZones, ...trusteesZones]

  for (const zoneData of zones) {
    await prisma.zone.upsert({
      where: { 
        code_electionType: {
          code: zoneData.code,
          electionType: zoneData.electionType
        }
      },
      update: {},
      create: zoneData
    })
  }

  console.log('Zones created successfully')

  // Create elections
  const elections = [
    {
      id: 'yuva-pank-2024',
      title: 'Yuva Pank Elections 2024',
      description: 'Youth leadership positions for the future of our community',
      type: 'YUVA_PANK',
      startDate: new Date('2024-12-01T00:00:00Z'),
      endDate: new Date('2024-12-15T23:59:59Z'),
      isOnlineNomination: true,
      // Age restrictions: Voter Age 18-40, Nominee Age 18-40
      voterMinAge: 18,
      voterMaxAge: 40,
      candidateMinAge: 18,
      candidateMaxAge: 40,
      voterJurisdiction: 'LOCAL',
      candidateJurisdiction: 'LOCAL'
    },
    {
      id: 'karobari-members-2024',
      title: 'Karobari Members Election 2024',
      description: 'Business committee members for community development',
      type: 'KAROBARI_MEMBERS',
      startDate: new Date('2024-12-01T00:00:00Z'),
      endDate: new Date('2024-12-15T23:59:59Z'),
      isOnlineNomination: false,
      // Age restrictions: Voter Age All, Nominee Age Above 25
      voterMinAge: null, // No minimum age
      voterMaxAge: null, // No maximum age
      candidateMinAge: 25,
      candidateMaxAge: null, // No maximum age
      voterJurisdiction: 'LOCAL',
      candidateJurisdiction: 'LOCAL'
    },
    {
      id: 'trustees-2024',
      title: 'Trustees Election 2024',
      description: 'All Samaj members are eligible to be elected as trustees',
      type: 'TRUSTEES',
      startDate: new Date('2024-12-01T00:00:00Z'),
      endDate: new Date('2024-12-15T23:59:59Z'),
      isOnlineNomination: false,
      // Age restrictions: Voter Age All, Candidate Age Above 45
      voterMinAge: null, // No minimum age - all ages can vote
      voterMaxAge: null, // No maximum age
      candidateMinAge: 45,
      candidateMaxAge: null, // No maximum age
      voterJurisdiction: 'ALL',
      candidateJurisdiction: 'LOCAL'
    }
  ]

  for (const electionData of elections) {
    await prisma.election.upsert({
      where: { id: electionData.id },
      update: {},
      create: electionData,
    })
  }

  console.log('Elections created successfully')
  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })