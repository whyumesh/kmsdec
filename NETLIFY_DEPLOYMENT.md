# Netlify Deployment Guide

This guide will help you deploy the KMS Election application to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://www.netlify.com)
2. Your GitHub/GitLab/Bitbucket repository connected
3. A PostgreSQL database (can use Netlify's add-ons or external service like Supabase, Neon, etc.)
4. Storj DCS account and credentials

## Step 1: Set Up Environment Variables

In your Netlify dashboard, go to **Site settings** → **Environment variables** and add:

### Required Variables

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-jwt-key-here
STORJ_ACCESS_KEY_ID=your-storj-access-key
STORJ_SECRET_ACCESS_KEY=your-storj-secret-key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=global
STORJ_BUCKET_NAME=kmselection
```

### Optional Variables

```
NODE_ENV=production
NEXTAUTH_SECRET=your-nextauth-secret (if using NextAuth)
```

## Step 2: Configure Build Settings

1. Go to **Site settings** → **Build & deploy**
2. Set **Build command**: `npm run build`
3. Set **Publish directory**: `.next` (this is handled automatically by the Netlify Next.js plugin)
4. Set **Node version**: `18` or higher

## Step 3: Deploy

### Option A: Connect Repository (Recommended)

1. In Netlify dashboard, click **Add new site** → **Import an existing project**
2. Connect your Git provider (GitHub/GitLab/Bitbucket)
3. Select your repository
4. Netlify will automatically detect Next.js and use the settings from `netlify.toml`
5. Click **Deploy site**

### Option B: Manual Deploy

1. Build your project locally:
   ```bash
   npm run build
   ```
2. In Netlify dashboard, go to **Sites** → **Add new site** → **Deploy manually**
3. Drag and drop the `.next` folder (or use Netlify CLI)

## Step 4: Post-Deployment Setup

### Database Setup

1. Run Prisma migrations:
   ```bash
   npx prisma migrate deploy
   ```
   
   Or via Netlify Functions/SSH:
   - Use Netlify's serverless functions to run migrations
   - Or connect via SSH and run migrations manually

### Verify Deployment

1. Check build logs in Netlify dashboard
2. Visit your deployed site URL
3. Test critical features:
   - Admin login
   - Candidate registration/login
   - Document upload
   - Nomination submission

## Important Notes

### Database Requirements

- **PostgreSQL** is required (MySQL/MongoDB won't work with Prisma)
- Ensure your database allows connections from Netlify's IP addresses
- Consider using connection pooling for better performance

### File Storage

- All documents are stored in **Storj DCS** (not local filesystem)
- Ensure Storj bucket exists and credentials are correct
- Test document upload/download after deployment

### Serverless Limitations

- Netlify Functions have execution time limits
- Large file uploads might need special handling
- Consider using Netlify's edge functions for better performance

### Prisma on Netlify

- Prisma Client is generated during `postinstall` hook
- Ensure `prisma generate` runs in build command if needed
- Database migrations should be run separately (not during build)

## Troubleshooting

### Build Fails

1. Check Node.js version matches (should be 18+)
2. Verify all environment variables are set
3. Check build logs for specific errors
4. Ensure `package.json` has correct dependencies

### Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check if database allows external connections
3. Ensure SSL mode is correct (may need `?sslmode=require`)

### Document Upload Issues

1. Verify Storj credentials are correct
2. Check Storj bucket exists and is accessible
3. Test Storj connection using `/api/upload/test` endpoint

### Runtime Errors

1. Check Netlify function logs
2. Verify environment variables are set correctly
3. Ensure Prisma Client is generated (`prisma generate`)

## Support

For issues:
1. Check Netlify build/deploy logs
2. Review application logs
3. Test locally first before deploying

