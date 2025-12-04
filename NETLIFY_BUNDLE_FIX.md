# Netlify Bundle Size Fix - Phase 1

## Problem
Even after removing Prisma, the function still exceeds 250 MB limit.

## Root Cause
Next.js is bundling too many dependencies into the server handler function.

## Solution Applied

### 1. Changed Node Bundler to "none"
```toml
[functions]
  node_bundler = "none"
```

This tells Netlify to **NOT bundle** any node_modules. Instead, all dependencies are loaded from `node_modules` at runtime.

### 2. Updated Next.js Config
- Removed all Prisma references from `serverComponentsExternalPackages`
- Updated `outputFileTracingExcludes` to exclude all Prisma files
- Added webpack externals to prevent bundling node_modules

### 3. Removed .env Files
- Set `included_files = []` to prevent including .env files
- Environment variables should be set in Netlify dashboard, not in files

## Expected Result

With `node_bundler = "none"`:
- **Function bundle**: Only Next.js server code (~10-50 MB)
- **Dependencies**: Loaded from node_modules at runtime (not counted in bundle size)
- **Total**: Should be well under 250 MB limit

## How It Works

1. **Build Phase**: Next.js builds the application
2. **Function Creation**: Netlify creates function with only the built code
3. **Runtime**: Dependencies are loaded from `node_modules` folder (which Netlify provides)

## Important Notes

- `node_bundler = "none"` means Netlify won't bundle dependencies
- All dependencies must be in `package.json` dependencies (not devDependencies)
- Netlify will install all dependencies during build
- Function size = built code only, not dependencies

## Verification

After deployment, check:
1. Build succeeds
2. Function size < 250 MB
3. Application runs correctly
4. Dependencies load at runtime

