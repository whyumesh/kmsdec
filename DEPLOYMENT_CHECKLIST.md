# 🚀 Netlify Deployment Checklist

## ✅ Build Status: READY

The project has been successfully built and is ready for Netlify deployment.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

Set these in Netlify Dashboard → Site settings → Environment variables:

**Required:**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens (32+ characters)
- [ ] `STORJ_ACCESS_KEY_ID` - Your Storj access key
- [ ] `STORJ_SECRET_ACCESS_KEY` - Your Storj secret key
- [ ] `STORJ_ENDPOINT` - Storj endpoint (e.g., `https://gateway.storjshare.io`)
- [ ] `STORJ_REGION` - Storj region (`global` or `us-east-1`)
- [ ] `STORJ_BUCKET_NAME` - Storj bucket name (e.g., `kmselection`)

**Optional:**
- [ ] `NODE_ENV=production`
- [ ] `NEXTAUTH_SECRET` - If using NextAuth (32+ characters)

### 2. Database Setup

- [ ] PostgreSQL database created and accessible
- [ ] Database URL configured correctly
- [ ] Database allows connections from Netlify
- [ ] SSL mode configured if required (`?sslmode=require`)
- [ ] Database migrations ready to run

### 3. Storj Setup

- [ ] Storj bucket exists (`kmselection`)
- [ ] Storj credentials are valid
- [ ] Bucket is accessible from Netlify
- [ ] Tested file upload/download locally

### 4. Build Configuration

- [ ] `netlify.toml` configured correctly ✅
- [ ] Node.js version set to 18+ ✅
- [ ] Build command: `npm run build` ✅
- [ ] `@netlify/plugin-nextjs` will be installed automatically ✅

### 5. Code Verification

- [ ] Build passes locally ✅
- [ ] TypeScript compiles without errors ✅
- [ ] No linting errors ✅
- [ ] All features tested locally

## 🚀 Deployment Steps

### Step 1: Install Netlify CLI (Optional)

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Initialize Site (if new)

```bash
netlify init
```

### Step 4: Deploy

**Option A: Git-based deployment (Recommended)**
1. Push your code to GitHub/GitLab/Bitbucket
2. In Netlify dashboard: **Add new site** → **Import an existing project**
3. Connect your Git provider
4. Select your repository
5. Netlify will auto-detect Next.js from `netlify.toml`
6. Set environment variables (see Step 1)
7. Click **Deploy site**

**Option B: Manual Deploy**
```bash
netlify deploy --prod
```

### Step 5: Post-Deployment

1. **Run Database Migrations**
   - Use Netlify Functions or SSH
   - Or run manually: `npx prisma migrate deploy`

2. **Verify Deployment**
   - Visit your site URL
   - Test admin login
   - Test candidate registration
   - Test document upload
   - Test nomination submission

3. **Monitor Logs**
   - Check Netlify function logs
   - Monitor build/deploy logs
   - Watch for runtime errors

## ⚠️ Important Notes

### Next.js 14 on Netlify

- The `@netlify/plugin-nextjs` plugin handles everything automatically
- No need to configure `publish` directory manually
- API routes become Netlify Functions automatically
- Static pages are optimized and cached

### Database Connection

- Use connection pooling for better performance
- Ensure database allows external connections
- Add SSL parameters if required
- Test connection before deploying

### File Storage

- All files are stored in Storj (not local filesystem)
- Storj URLs are generated on-demand (7-day expiry)
- Files are accessible via `/api/admin/view-document` endpoint

### Function Timeouts

- Default timeout: 10 seconds
- For large uploads, may need to increase (configure in netlify.toml)
- Consider chunked uploads for very large files

## 🔍 Troubleshooting

### Build Fails

1. Check Node.js version (should be 18+)
2. Verify all environment variables are set
3. Check build logs in Netlify dashboard
4. Run `npm run build` locally first

### Runtime Errors

1. Check Netlify function logs
2. Verify environment variables
3. Test database connection
4. Test Storj connection

### Database Issues

1. Verify `DATABASE_URL` format
2. Check database allows external connections
3. Ensure SSL is configured correctly
4. Test connection using Prisma Studio

## 📞 Support

- Netlify Docs: https://docs.netlify.com
- Next.js on Netlify: https://docs.netlify.com/integrations/frameworks/next-js/
- Prisma Docs: https://www.prisma.io/docs
- Storj Docs: https://docs.storj.io

