#!/bin/bash

# Production Build Script for KMS Election System
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting production build process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Please copy env.production.example to .env.local and configure it."
    echo "   cp env.production.example .env.local"
    echo "   Then edit .env.local with your production values."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Run database migrations (if needed)
echo "🔄 Running database migrations..."
npx prisma db push

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if build was successful
if [ -d ".next" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output: .next/"
    echo "🚀 Ready for production deployment!"
    
    # Show build size
    echo "📊 Build size:"
    du -sh .next/
    
    # Show next steps
    echo ""
    echo "🎯 Next steps:"
    echo "1. Deploy to your hosting platform"
    echo "2. Set up your production environment variables"
    echo "3. Configure your database connection"
    echo "4. Test the application thoroughly"
    
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi
