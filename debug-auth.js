#!/usr/bin/env node

// Debug script to check authentication issues in production
console.log('=== Authentication Debug Script ===\n');

// Check environment variables
console.log('1. Environment Variables:');
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'JWT_SECRET', 
  'NEXTAUTH_URL',
  'DATABASE_URL'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('SECRET') ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
  }
});

console.log('\n2. Database Connection Test:');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.$connect()
    .then(async () => {
      console.log('✅ Database connection successful');
      
      // Check if admin user exists
      const adminUser = await prisma.user.findFirst({
        where: {
          adminProfile: {
            isNot: null
          }
        },
        include: {
          adminProfile: true
        }
      });
      
      if (adminUser) {
        console.log('✅ Admin user found:', {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          adminId: adminUser.adminProfile?.adminId
        });
      } else {
        console.log('❌ No admin user found in database');
        console.log('   You need to create an admin user first.');
      }
      
      await prisma.$disconnect();
    })
    .catch(error => {
      console.log('❌ Database connection failed:', error.message);
    });
} catch (error) {
  console.log('❌ Prisma client error:', error.message);
}

console.log('\n3. NextAuth Configuration:');
console.log('NEXTAUTH_URL should match your production domain');
console.log('NEXTAUTH_SECRET should be a strong, random string');
console.log('JWT_SECRET should be different from NEXTAUTH_SECRET');

console.log('\n4. Common Issues:');
console.log('- Check if your production domain matches NEXTAUTH_URL');
console.log('- Ensure all environment variables are set in your deployment platform');
console.log('- Verify database is accessible from production');
console.log('- Check if admin user exists in the database');
console.log('- Ensure NEXTAUTH_SECRET and JWT_SECRET are set and consistent');
