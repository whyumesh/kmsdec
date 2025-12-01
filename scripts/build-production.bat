@echo off
REM Production Build Script for KMS Election System (Windows)
REM This script prepares the application for production deployment

echo 🚀 Starting production build process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if .env.local exists
if not exist ".env.local" (
    echo ⚠️  Warning: .env.local not found. Please copy env.production.example to .env.local and configure it.
    echo    copy env.production.example .env.local
    echo    Then edit .env.local with your production values.
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" (
        exit /b 1
    )
)

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist ".next" rmdir /s /q ".next"
if exist "out" rmdir /s /q "out"
if exist "dist" rmdir /s /q "dist"

REM Install dependencies
echo 📦 Installing dependencies...
npm ci --prefer-offline --no-audit
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Generate Prisma client
echo 🗄️  Generating Prisma client...
npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

REM Run database migrations (if needed)
echo 🔄 Running database migrations...
npx prisma db push
if errorlevel 1 (
    echo ⚠️  Database migration failed, but continuing...
)

REM Run linting
echo 🔍 Running linting...
npm run lint
if errorlevel 1 (
    echo ⚠️  Linting failed, but continuing...
)

REM Build the application
echo 🏗️  Building application...
npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

REM Check if build was successful
if exist ".next" (
    echo ✅ Build completed successfully!
    echo 📁 Build output: .next/
    echo 🚀 Ready for production deployment!
    
    REM Show next steps
    echo.
    echo 🎯 Next steps:
    echo 1. Deploy to your hosting platform
    echo 2. Set up your production environment variables
    echo 3. Configure your database connection
    echo 4. Test the application thoroughly
    
) else (
    echo ❌ Build failed! Check the error messages above.
    pause
    exit /b 1
)

pause
