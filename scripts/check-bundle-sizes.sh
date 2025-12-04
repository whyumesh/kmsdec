#!/bin/bash

# Bundle Size Checker Script
# This script checks the size of various directories to identify what's taking up space

echo "📊 Bundle Size Analysis"
echo "======================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to format size
format_size() {
    local size=$1
    if [ -z "$size" ] || [ "$size" = "unknown" ]; then
        echo "N/A"
    else
        echo "$size"
    fi
}

# Check .next directory
if [ -d ".next" ]; then
    echo -e "${BLUE}📁 .next directory:${NC}"
    NEXT_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "   Total: $(format_size "$NEXT_SIZE")"
    echo ""
    
    # Check .next/server
    if [ -d ".next/server" ]; then
        echo -e "${BLUE}📁 .next/server:${NC}"
        SERVER_SIZE=$(du -sh .next/server 2>/dev/null | cut -f1)
        SERVER_SIZE_BYTES=$(du -sb .next/server 2>/dev/null | cut -f1)
        echo "   Size: $(format_size "$SERVER_SIZE")"
        
        # Check for large files in .next/server
        echo "   Largest files:"
        find .next/server -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10 | while read -r size file; do
            echo "     $size - $file"
        done
        echo ""
    fi
    
    # Check .next/standalone
    if [ -d ".next/standalone" ]; then
        echo -e "${BLUE}📁 .next/standalone:${NC}"
        STANDALONE_SIZE=$(du -sh .next/standalone 2>/dev/null | cut -f1)
        echo "   Size: $(format_size "$STANDALONE_SIZE")"
        echo ""
    fi
    
    # Check .next/static
    if [ -d ".next/static" ]; then
        echo -e "${BLUE}📁 .next/static:${NC}"
        STATIC_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1)
        echo "   Size: $(format_size "$STATIC_SIZE")"
        echo ""
    fi
    
    # Check .next/cache
    if [ -d ".next/cache" ]; then
        echo -e "${YELLOW}⚠️  .next/cache exists (should be removed):${NC}"
        CACHE_SIZE=$(du -sh .next/cache 2>/dev/null | cut -f1)
        echo "   Size: $(format_size "$CACHE_SIZE")"
        echo ""
    fi
    
    # Count .map files
    MAP_COUNT=$(find .next -name "*.map" -type f 2>/dev/null | wc -l)
    if [ "$MAP_COUNT" -gt 0 ]; then
        MAP_SIZE=$(find .next -name "*.map" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1)
        echo -e "${YELLOW}⚠️  Found $MAP_COUNT .map files in .next (total: $MAP_SIZE)${NC}"
        echo ""
    fi
else
    echo -e "${RED}❌ .next directory not found. Run 'npm run build' first.${NC}"
    echo ""
fi

# Check node_modules
if [ -d "node_modules" ]; then
    echo -e "${BLUE}📁 node_modules:${NC}"
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "   Total: $(format_size "$NODE_MODULES_SIZE")"
    echo ""
    
    # Check Prisma
    if [ -d "node_modules/.prisma" ]; then
        echo -e "${BLUE}📁 node_modules/.prisma:${NC}"
        PRISMA_SIZE=$(du -sh node_modules/.prisma 2>/dev/null | cut -f1)
        echo "   Size: $(format_size "$PRISMA_SIZE")"
        
        # Check Prisma binary
        if [ -f "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" ]; then
            BINARY_SIZE=$(du -h "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" 2>/dev/null | cut -f1)
            echo "   RHEL Binary: $(format_size "$BINARY_SIZE")"
        fi
        echo ""
    fi
    
    # Check largest packages
    echo -e "${BLUE}📦 Largest packages in node_modules:${NC}"
    du -sh node_modules/* 2>/dev/null | sort -rh | head -15 | while read -r size package; do
        package_name=$(basename "$package")
        echo "   $size - $package_name"
    done
    echo ""
fi

# Estimate Netlify function size
if [ -d ".next/server" ] && [ -f "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" ]; then
    echo -e "${BLUE}📊 Estimated Netlify Function Size:${NC}"
    SERVER_SIZE_BYTES=$(du -sb .next/server 2>/dev/null | cut -f1)
    BINARY_SIZE_BYTES=$(du -sb "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node" 2>/dev/null | cut -f1)
    
    if [ -n "$SERVER_SIZE_BYTES" ] && [ -n "$BINARY_SIZE_BYTES" ]; then
        TOTAL_BYTES=$((SERVER_SIZE_BYTES + BINARY_SIZE_BYTES))
        TOTAL_MB=$((TOTAL_BYTES / 1024 / 1024))
        
        echo "   .next/server: $SERVER_SIZE_BYTES bytes (~$((SERVER_SIZE_BYTES / 1024 / 1024)) MB)"
        echo "   Prisma binary: $BINARY_SIZE_BYTES bytes (~$((BINARY_SIZE_BYTES / 1024 / 1024)) MB)"
        echo "   Total: $TOTAL_BYTES bytes (~$TOTAL_MB MB)"
        
        if [ "$TOTAL_MB" -gt 250 ]; then
            echo -e "   ${RED}❌ EXCEEDS 250 MB LIMIT by ~$((TOTAL_MB - 250)) MB${NC}"
        else
            echo -e "   ${GREEN}✅ Within 250 MB limit (${TOTAL_MB} MB / 250 MB)${NC}"
        fi
    fi
    echo ""
fi

echo "======================"
echo "✅ Analysis complete!"

