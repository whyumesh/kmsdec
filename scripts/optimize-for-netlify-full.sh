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

# Step 5: Skip removing dev dependencies (edge bundler may need them)
print_info "Step 5: Skipping dev dependency removal (preserves edge function dependencies)..."
# npm prune --production removes dev dependencies which might include:
# - TypeScript (needed for edge bundler type resolution)
# - Build tools that edge bundler uses
# - Dependencies that Next.js edge runtime needs
# Keeping all dependencies ensures edge bundler can find everything it needs
print_success "All dependencies preserved (including dev dependencies)"

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

# Step 7: Skip aggressive node_modules cleanup to preserve edge function dependencies
print_info "Step 7: Skipping aggressive node_modules cleanup (preserves edge function bundling)..."

# IMPORTANT: Edge function bundler runs AFTER this script and needs:
# - Complete node_modules structure
# - TypeScript source files (for type resolution)
# - All package files (edge bundler may import them)
# - Directory structure intact

# Only remove platform-specific binaries that are definitely not needed
# (Windows/Mac binaries when deploying to Linux)
find node_modules -name "*.exe" -type f -delete 2>/dev/null || true
find node_modules -name "*.dylib" -type f -delete 2>/dev/null || true
print_info "  Removed Windows/Mac binaries only"

# DO NOT remove:
# - TypeScript files (edge bundler needs them for bundling)
# - Test files (some packages reference them)
# - Source maps (may be needed for debugging)
# - Documentation (some packages import from docs)
# - Directory structure (edge bundler expects specific paths)
# - Any files in Next.js, @netlify, or edge-related packages
# - Any files that might be transitively imported

print_success "node_modules structure preserved for edge function bundling"

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

