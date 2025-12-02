# Netlify Function Size Fix - 250MB Limit

## Problem
The Netlify serverless function exceeds the 250MB limit, causing deployment failures.

## Solution Applied

### 1. Updated `.nfrc.json`
- **Removed** `@prisma/client` and `prisma` from external modules (they MUST be bundled)
- **Added** more packages to external modules to reduce bundle size:
  - `twilio`, `recharts`, `@upstash/ratelimit`, `@upstash/redis`, `pdf-parse`

### 2. Updated `next.config.js`
- **Added** more packages to `serverComponentsExternalPackages`:
  - `twilio`, `recharts`, `@upstash/ratelimit`, `@upstash/redis`, `pdf-parse`
- **Enhanced** webpack externalization to exclude more large dependencies

### 3. Updated `netlify.toml`
- **Removed** duplicate `[build]` section
- **Kept** `included_files = []` to prevent unnecessary files from being bundled
- **Using** `esbuild` bundler for better optimization

## Key Changes

### Prisma Must Be Bundled
⚠️ **IMPORTANT**: `@prisma/client` and `prisma` MUST be bundled in the function. They were incorrectly externalized in `.nfrc.json` and have been removed.

### Externalized Packages
These packages are now externalized (installed at runtime, not bundled):
- `pg`, `bcryptjs`, `jsonwebtoken`, `nodemailer`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- `cloudinary`, `pdf-parse`, `exceljs`, `jspdf`
- `jsdom`, `isomorphic-dompurify`
- `twilio`, `csv-parser`, `recharts`
- `@upstash/ratelimit`, `@upstash/redis`

## Next Steps

1. **Commit and push** these changes
2. **Redeploy** on Netlify
3. **Monitor** the build logs to verify function size is under 250MB

## If Still Too Large

If the function still exceeds 250MB after these changes:

### Option 1: Remove Unused Dependencies
Check `package.json` and remove any unused packages.

### Option 2: Split API Routes
Create separate Netlify functions for different API route groups.

### Option 3: Use Netlify Edge Functions
Migrate some lightweight API routes to Edge Functions.

### Option 4: Contact Netlify Support
Request a function size limit increase (may require paid plan).

## Verification

After deployment, check:
- Build logs show function size < 250MB
- Deployment succeeds
- API routes work correctly
- Database connections work
