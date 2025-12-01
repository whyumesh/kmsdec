#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up KMS Election System...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed');

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('\n🗄️  Setting up database...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Push database schema
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema created');
} catch (error) {
  console.error('❌ Failed to create database schema:', error.message);
  process.exit(1);
}

// Seed database
try {
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('✅ Database seeded with initial data');
} catch (error) {
  console.error('❌ Failed to seed database:', error.message);
  process.exit(1);
}

// Create .env.local if it doesn't exist
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('\n🔧 Creating environment file...');
  const envContent = `# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="kms-election-secret-key-2024"

# OTP Service (for production, use real SMS service)
OTP_SERVICE_API_KEY="demo-key"
OTP_SERVICE_URL="demo-url"

# Admin credentials (for initial setup)
ADMIN_EMAIL="admin@kms-election.com"
ADMIN_PASSWORD="admin123"
ADMIN_PHONE="+1234567890"
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run "npm run dev" to start the development server');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. Use admin@kms-election.com / password123 to login as admin');
console.log('4. Test voter login with phone: +1234567891 (OTP will be shown in console)');
console.log('\n🔐 Default credentials:');
console.log('Admin: admin@kms-election.com / password123');
console.log('Sample voters: +1234567891, +1234567892, +1234567893');
console.log('\n📚 Check README.md for detailed documentation');
console.log('\nHappy coding! 🚀');
