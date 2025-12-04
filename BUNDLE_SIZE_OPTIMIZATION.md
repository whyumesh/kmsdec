# Bundle Size Optimization Guide

## Overview

This document outlines all optimizations implemented to reduce the Netlify serverless function bundle size below 250MB.

## Current Status

- **Target**: < 250MB (Netlify limit)
- **Optimization Methods**: Multiple layers of optimization

---

## 1. Dynamic Imports

### Heavy Libraries Converted to Dynamic Imports

**Before:**
```typescript
import ExcelJS from 'exceljs'
```

**After:**
```typescript
const ExcelJS = (await import('exceljs')).default
```

**Files Updated:**
- ✅ `src/app/api/admin/export/route.ts` - ExcelJS now dynamically imported
- ✅ `src/app/api/admin/export-insights/route.ts` - Already using dynamic import

**Benefits:**
- Libraries are only loaded when the route is accessed
- Reduces initial bundle size significantly
- ExcelJS (~5MB) is not included in the base bundle

---

## 2. Netlify Configuration (netlify.toml)

### Externalized Dependencies

All heavy dependencies are externalized, meaning they're NOT bundled but loaded from `node_modules` at runtime:

```toml
external_node_modules = [
  "@prisma/client",
  "prisma",
  "pg",
  "bcryptjs",
  "jsonwebtoken",
  "nodemailer",
  "@aws-sdk/client-s3",
  "@aws-sdk/s3-request-presigner",
  "@aws-sdk/client-sso",
  "@aws-sdk/client-sso-oidc",
  "@aws-sdk/credential-providers",
  "cloudinary",
  "pdf-parse",
  "exceljs",
  "jspdf",
  "jsdom",
  "isomorphic-dompurify",
  "twilio",
  "csv-parser",
  "@upstash/ratelimit",
  "@upstash/redis",
  "date-fns",
  "uuid",
  "zod",
  "react",
  "react-dom",
  "next-auth",
  "@hookform/resolvers",
  "react-hook-form",
  "recharts"
]
```

### Excluded Patterns

Files matching these patterns are excluded from the bundle:

```toml
excluded_patterns = [
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**",
  "**/test/**",
  "**/tests/**",
  "**/*.map",
  "**/README*",
  "**/CHANGELOG*",
  "**/LICENSE*",
  "**/examples/**",
  "**/example/**",
  "**/docs/**",
  "**/documentation/**",
  "**/*.md",
  "**/*.ts",
  "!**/*.d.ts",
  "**/node_modules/@swc/**",
  "**/node_modules/@esbuild/**",
  "**/node_modules/webpack/**",
  "**/node_modules/terser/**"
]
```

### Included Files

Only the essential Prisma binary is included:

```toml
included_files = [
  "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
  "node_modules/@prisma/engines/**/libquery_engine-rhel-openssl-3.0.x.so.node"
]
```

---

## 3. Next.js Configuration (next.config.js)

### Output File Tracing Excludes

Excludes unnecessary files from the serverless function bundle:

```javascript
outputFileTracingExcludes: {
  '*': [
    // Platform-specific SWC binaries (keep only Linux)
    'node_modules/@swc/core-linux-x64-gnu/**/*',
    'node_modules/@swc/core-darwin-x64/**/*',
    'node_modules/@swc/core-darwin-arm64/**/*',
    'node_modules/@swc/core-win32-x64/**/*',
    
    // Build tools not needed at runtime
    'node_modules/@esbuild/**/*',
    'node_modules/terser/**/*',
    'node_modules/webpack/**/*',
    'node_modules/.cache/**/*',
    
    // Prisma engines (except RHEL)
    'node_modules/.prisma/client/libquery_engine-darwin*',
    'node_modules/.prisma/client/libquery_engine-windows*',
    'node_modules/.prisma/client/libquery_engine-debian*',
    'node_modules/.prisma/client/libquery_engine-linux-musl*',
    'node_modules/@prisma/engines/**/query-engine-darwin*',
    'node_modules/@prisma/engines/**/query-engine-windows*',
    'node_modules/@prisma/engines/**/query-engine-debian*',
    'node_modules/@prisma/engines/**/query-engine-linux-musl*',
    'node_modules/@prisma/engines/**/migration-engine*',
    'node_modules/@prisma/engines/**/introspection-engine*',
    'node_modules/@prisma/engines/**/prisma-fmt*',
    
    // Test files and documentation
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**/*',
    '**/test/**/*',
    '**/tests/**/*',
    '**/*.map',
    '**/README*',
    '**/CHANGELOG*',
    '**/LICENSE*',
    '**/examples/**',
    '**/example/**',
    '**/docs/**',
    '**/documentation/**',
    
    // TypeScript source files (keep only .d.ts)
    '**/*.ts',
    '!**/*.d.ts',
    
    // Radix UI stories
    'node_modules/@radix-ui/**/*.stories.*',
    'node_modules/@radix-ui/**/README*',
    
    // Recharts examples and TypeScript sources
    'node_modules/recharts/**/*.ts',
    'node_modules/recharts/**/examples/**',
    
    // date-fns locale files and alternative builds
    'node_modules/date-fns/**/locale/**',
    'node_modules/date-fns/**/esm/**',
    'node_modules/date-fns/**/fp/**',
  ],
}
```

### Server Components External Packages

Packages that should not be bundled for server components:

```javascript
serverComponentsExternalPackages: [
  'prisma',
  '@prisma/client',
  'pg',
  'bcryptjs',
  'jsonwebtoken',
  'nodemailer',
  'csv-parser',
  'exceljs',
  'jspdf',
  'uuid',
  'zod',
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-request-presigner',
  '@aws-sdk/client-sso',
  '@aws-sdk/client-sso-oidc',
  '@aws-sdk/credential-providers',
  'cloudinary',
  'isomorphic-dompurify',
  'jsdom',
  'twilio',
  '@upstash/ratelimit',
  '@upstash/redis',
  'pdf-parse',
  'date-fns',
  'react',
  'react-dom',
  'next-auth',
  '@hookform/resolvers',
  'react-hook-form',
  'recharts'
]
```

### Webpack Externals

Additional webpack externalization for server-side builds:

```javascript
webpack: (config, { dev, isServer }) => {
  if (!dev && isServer) {
    config.externals.push(
      // Large dependencies
      'pg', 'bcryptjs', 'jsonwebtoken', 'nodemailer',
      '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner',
      'cloudinary', 'pdf-parse', 'exceljs', 'jspdf',
      'jsdom', 'isomorphic-dompurify', 'twilio',
      '@upstash/ratelimit', '@upstash/redis',
      // Pattern-based externals
      { '@aws-sdk': 'commonjs @aws-sdk' },
      { '@prisma': 'commonjs @prisma' },
      { 'prisma': 'commonjs prisma' }
    )
  }
}
```

---

## 4. Build Script Optimization

The `scripts/optimize-for-netlify-full.sh` script performs aggressive cleanup:

### Steps:

1. **Clean previous builds** - Removes `.next`, `.cache`, `.turbo`
2. **Install dependencies** - `npm ci --legacy-peer-deps`
3. **Generate Prisma client** - `npx prisma generate`
4. **Build Next.js** - `npm run build`
5. **Remove dev dependencies** - `npm prune --production`
6. **Remove unnecessary Prisma binaries** - Keeps only RHEL binary
7. **Remove heavy/unused files**:
   - TypeScript source files (except .d.ts)
   - Test files and directories
   - Source maps
   - Documentation files
   - Example directories
   - Platform-specific binaries (Windows, macOS)
   - Recharts examples
   - date-fns locale files
   - Radix UI stories
8. **Final size report**

---

## 5. Prisma Binary Optimization

### Binary Targets

Only the RHEL binary is kept (required for Netlify):

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

### Removed Binaries

- ❌ Darwin (macOS) binaries
- ❌ Windows binaries
- ❌ Debian binaries
- ❌ Linux musl binaries
- ❌ Migration engines
- ❌ Introspection engines
- ❌ Prisma fmt

**Size Reduction**: ~150-200MB (from multiple platform binaries)

---

## 6. Tree Shaking & Code Splitting

### Enabled Optimizations

- ✅ Tree shaking (`usedExports: true`)
- ✅ Side effects optimization (`sideEffects: false`)
- ✅ Code splitting for vendors
- ✅ Radix UI separate chunk
- ✅ SWC minification enabled

---

## 7. Estimated Size Breakdown

### Before Optimization
- Prisma binaries (all platforms): ~200MB
- node_modules (full): ~500MB+
- .next/server: ~100MB+
- **Total**: >800MB ❌

### After Optimization
- Prisma RHEL binary only: ~40-50MB ✅
- Externalized dependencies: 0MB (loaded from node_modules) ✅
- .next/server (optimized): ~50-80MB ✅
- **Total**: ~90-130MB ✅

---

## 8. Monitoring Bundle Size

### Check Function Size

After deployment, check function size in Netlify Dashboard:
1. Go to **Functions** tab
2. Click on your function
3. Check the **Size** column

### Local Size Check

Run the PowerShell script from `BUNDLE_SIZE_REPORT.md`:

```powershell
# Check .next/server size
if (Test-Path '.next\server') {
    $serverSize = (Get-ChildItem .next\server -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    Write-Host ".next/server: $([math]::Round($serverSize / 1MB, 2)) MB"
}

# Check Prisma binary size
if (Test-Path 'node_modules\.prisma\client\libquery_engine-rhel-openssl-3.0.x.so.node') {
    $engineSize = (Get-Item 'node_modules\.prisma\client\libquery_engine-rhel-openssl-3.0.x.so.node').Length
    Write-Host "Prisma RHEL Engine: $([math]::Round($engineSize / 1MB, 2)) MB"
}
```

---

## 9. Additional Optimizations

### If Still Exceeding Limit

1. **Further Dynamic Imports**:
   - Convert more static imports to dynamic imports
   - Lazy load routes that use heavy libraries

2. **Remove Unused Dependencies**:
   - Audit `package.json` for unused packages
   - Remove development-only dependencies

3. **Split Large API Routes**:
   - Break down large API routes into smaller functions
   - Use Netlify Background Functions for long-running tasks

4. **Optimize Images**:
   - Use Next.js Image optimization
   - Serve images from CDN

5. **Consider Prisma Data Proxy**:
   - Use Prisma Data Proxy to reduce binary size
   - Requires Prisma Cloud account

---

## 10. Best Practices

### ✅ Do:

- Use dynamic imports for heavy libraries
- Externalize large dependencies
- Remove platform-specific binaries
- Remove test files and documentation
- Use tree shaking
- Monitor bundle size regularly

### ❌ Don't:

- Import heavy libraries statically in API routes
- Include unnecessary Prisma binaries
- Bundle test files
- Include platform-specific binaries
- Skip optimization steps

---

## Summary

With all these optimizations in place, your Netlify function bundle should be well under the 250MB limit. The key strategies are:

1. **Externalization** - Don't bundle large dependencies
2. **Dynamic Imports** - Load libraries only when needed
3. **Binary Optimization** - Keep only required Prisma binary
4. **File Exclusions** - Remove unnecessary files
5. **Tree Shaking** - Remove unused code

**Expected Result**: Bundle size ~90-130MB (well under 250MB limit) ✅

