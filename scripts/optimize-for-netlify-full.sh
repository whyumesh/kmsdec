#!/bin/bash

# Netlify Deployment Optimization Script (Full Version)
# This version installs all dependencies for building, then optimizes
# Better for builds that require dev dependencies (TypeScript, etc.)
#
# Usage: ./scripts/optimize-for-netlify-full.sh

set -e  # Exit on any error

echo "🚀 Starting Netlify deployment optimization (Full Version)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Check if .next already exists (build was run before this script)
if [ -d ".next" ]; then
    print_info "Step 1: .next directory found - skipping build (already completed)"
    SKIP_BUILD=true
else
    print_info "Step 1: .next directory not found - will build Next.js app"
    SKIP_BUILD=false
    # Clean previous builds
    rm -rf .next
    rm -rf .cache
    rm -rf .turbo
    print_success "Cleanup completed"
fi

# Step 2: Install dependencies if not already installed
if [ "$SKIP_BUILD" = false ]; then
    print_info "Step 2: Installing all dependencies..."
    npm ci --legacy-peer-deps
    print_success "Dependencies installed"
else
    print_info "Step 2: Skipping dependency installation (already done)"
fi

# Step 3: Generate Prisma client if not already generated
if [ "$SKIP_BUILD" = false ]; then
    print_info "Step 3: Generating Prisma client..."
    npx prisma generate
    print_success "Prisma client generated"
else
    print_info "Step 3: Skipping Prisma generation (already done)"
fi

# Step 4: Build Next.js application (only if not already built)
if [ "$SKIP_BUILD" = false ]; then
    print_info "Step 4: Building Next.js application..."
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    npm run build
    print_success "Next.js build completed"
else
    print_info "Step 4: Skipping build (already completed)"
fi

# Step 5: Remove dev dependencies
print_info "Step 5: Removing dev dependencies..."
npm prune --production
print_success "Dev dependencies removed"

# Step 5a: Skip dedupe - can break edge function bundling
# npm dedupe reorganizes node_modules which can break Netlify edge function bundler
# The edge bundler expects specific dependency locations
print_info "Step 5a: Skipping dependency deduplication (preserves edge function compatibility)"
print_success "Dependencies left as-is for edge function compatibility"

# Step 6: Remove unnecessary Prisma binaries
print_info "Step 6: Removing unnecessary Prisma binaries..."
KEEP_BINARY="libquery_engine-rhel-openssl-3.0.x.so.node"

PRISMA_DIRS=(
    "node_modules/.prisma/client"
    "node_modules/@prisma/engines"
)

for dir in "${PRISMA_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_info "  Scanning $dir..."
        find "$dir" -type f \( -name "libquery_engine*.so.node" -o -name "libquery_engine*.dylib.node" -o -name "query_engine*.exe" \) 2>/dev/null | while read -r binary; do
            binary_name=$(basename "$binary")
            if [[ "$binary_name" != "$KEEP_BINARY" ]]; then
                print_info "    Removing: $binary_name"
                rm -f "$binary" 2>/dev/null || true
            else
                print_success "    Keeping: $binary_name"
            fi
        done
        find "$dir" -type f -name "*migration-engine*" ! -name "*rhel-openssl-3.0.x*" -delete 2>/dev/null || true
        find "$dir" -type f -name "*introspection-engine*" ! -name "*rhel-openssl-3.0.x*" -delete 2>/dev/null || true
        find "$dir" -type f -name "*prisma-fmt*" ! -name "*rhel-openssl-3.0.x*" -delete 2>/dev/null || true
        find "$dir" -type d \( -name "*darwin*" -o -name "*windows*" -o -name "*debian*" -o -name "*musl*" \) -exec rm -rf {} + 2>/dev/null || true
    fi
done

print_success "Prisma binaries optimized"

# Step 7: Remove heavy/unused files
print_info "Step 7: Removing heavy and unused files..."

# Remove TypeScript source files (keep only .d.ts)
find node_modules -name "*.ts" ! -name "*.d.ts" -not -path "*/node_modules/@types/*" -type f -delete 2>/dev/null || true

# Remove test files and directories
find node_modules -type d \( -name "__tests__" -o -name "test" -o -name "tests" \) -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "*.test.*" -type f -delete 2>/dev/null || true
find node_modules -name "*.spec.*" -type f -delete 2>/dev/null || true

# Remove source maps
find node_modules -name "*.map" -type f -delete 2>/dev/null || true

# Remove documentation files
find node_modules -name "README*" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.md" -type f -delete 2>/dev/null || true

# Remove example directories
find node_modules -type d \( -name "examples" -o -name "example" -o -name "docs" -o -name "documentation" \) -exec rm -rf {} + 2>/dev/null || true

# Remove platform-specific binaries (keep Linux)
find node_modules -name "*.exe" -o -name "*.dylib" -type f -delete 2>/dev/null || true
find node_modules -type d \( -name "win32*" -o -name "darwin*" -o -name "*windows*" -o -name "*macos*" \) -exec rm -rf {} + 2>/dev/null || true

# Remove SWC platform-specific binaries (keep Linux)
find node_modules/@swc -type f \( -name "*darwin*" -o -name "*win32*" -o -name "*windows*" -o -name "*macos*" \) -delete 2>/dev/null || true

# Remove esbuild platform-specific binaries (keep Linux)
find node_modules/esbuild -name "esbuild-*" ! -name "*linux*" -type f -delete 2>/dev/null || true

# Remove recharts examples and TypeScript sources
find node_modules/recharts -name "*.ts" ! -name "*.d.ts" -type f -delete 2>/dev/null || true
find node_modules/recharts -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true

# Remove date-fns locale files and alternative builds (keep only needed)
find node_modules/date-fns -type d \( -name "locale" -o -name "esm" -o -name "fp" \) -exec rm -rf {} + 2>/dev/null || true

# Remove Radix UI stories and examples
find node_modules/@radix-ui -name "*.stories.*" -type f -delete 2>/dev/null || true
find node_modules/@radix-ui -name "README*" -type f -delete 2>/dev/null || true

# Remove empty directories
find node_modules -type d -empty -delete 2>/dev/null || true

print_success "Heavy and unused files removed"

# Step 8: Minimal .next cleanup (preserve ALL files needed by Netlify plugin)
print_info "Step 8: Minimal .next cleanup (preserving all plugin-required files)..."
if [ -d ".next" ]; then
    # Only remove source maps (safe - not needed at runtime)
    find .next -name "*.map" -type f -delete 2>/dev/null || true
    print_info "  Removed .map files from .next"
    
    # Remove cache directory (safe - rebuilds on deploy)
    if [ -d ".next/cache" ]; then
        rm -rf .next/cache 2>/dev/null || true
        print_info "  Removed .next/cache directory"
    fi
    
    # DO NOT remove:
    # - .next/BUILD_ID (required by plugin)
    # - .next/routes-manifest.json (required by plugin)
    # - .next/prerender-manifest.json (required by plugin)
    # - .next/server/** (entire directory - required by plugin)
    # - .next/static/** (entire directory - required by plugin)
    # - .next/standalone/** (may be needed, preserve it)
    # - Any JSON files (may be manifests)
    # - Any other files or directories
    
    print_info "  Preserved ALL manifest files, BUILD_ID, and directory structure"
    print_info "  Netlify Next.js plugin requires these files to function correctly"
fi
print_success ".next directory minimally cleaned (all plugin files preserved)"

# Step 9: Final size report
print_info "Step 9: Final size report..."
FINAL_NODE_MODULES=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "unknown")
FINAL_PRISMA=$(du -sh node_modules/.prisma 2>/dev/null | cut -f1 || echo "unknown")
BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")

# Detailed size breakdown
if [ -d ".next/server" ]; then
    SERVER_SIZE=$(du -sh .next/server 2>/dev/null | cut -f1 || echo "unknown")
    echo "   • .next/server: $SERVER_SIZE"
fi

if [ -d ".next/static" ]; then
    STATIC_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1 || echo "unknown")
    echo "   • .next/static: $STATIC_SIZE"
fi

# Check Prisma binary size
if [ -f "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" ]; then
    PRISMA_BINARY_SIZE=$(du -h "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" 2>/dev/null | cut -f1 || echo "unknown")
    echo "   • Prisma RHEL binary: $PRISMA_BINARY_SIZE"
fi

echo ""
print_success "🎉 Optimization complete!"
echo ""
echo "📊 Size Summary:"
echo "   • node_modules: $FINAL_NODE_MODULES"
echo "   • Prisma: $FINAL_PRISMA"
echo "   • .next build: $BUILD_SIZE"
echo ""
echo "✅ Ready for Netlify deployment!"

