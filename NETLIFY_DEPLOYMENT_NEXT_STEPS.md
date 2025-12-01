# Netlify Deployment - Next Steps Checklist

Since you've already set up continuous deployment on Netlify, follow these steps to complete your production deployment:

## ✅ Step 1: Configure Environment Variables

Go to your Netlify dashboard → **Site settings** → **Environment variables** and add ALL of these:

### Required Environment Variables

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-key-minimum-32-characters
NEXTAUTH_SECRET=your-nextauth-secret-key-minimum-32-characters
NEXTAUTH_URL=https://your-site-name.netlify.app
NODE_ENV=production
```

### Storj DCS Configuration (Required for file uploads)

```
STORJ_ACCESS_KEY_ID=your-storj-access-key-id
STORJ_SECRET_ACCESS_KEY=your-storj-secret-access-key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=global
STORJ_BUCKET_NAME=kmselection
```

### Optional but Recommended

```
BCRYPT_ROUNDS=12
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### Twilio SMS Configuration (REQUIRED for OTP sending)

```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Get these from:** https://console.twilio.com/
- Account SID: Dashboard → Account Info
- Auth Token: Dashboard → Account Info (click to reveal)
- Phone Number: Dashboard → Phone Numbers → Manage → Active numbers

### Email Configuration (if using email notifications)

```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

**⚠️ IMPORTANT:** 
- Replace all placeholder values with your actual credentials
- Use strong, unique secrets (minimum 32 characters)
- Never commit these values to Git

---

## ✅ Step 2: Verify Build Settings

In Netlify dashboard → **Site settings** → **Build & deploy** → **Build settings**:

- **Build command**: `npm run build` ✅ (should be set automatically)
- **Publish directory**: `.next` (handled by Netlify Next.js plugin)
- **Node version**: `18` or higher

The `netlify.toml` file should handle this automatically.

---

## ✅ Step 3: Trigger First Deployment

1. **Push your latest changes to your Git repository** (if not already done):
   ```bash
   git add .
   git commit -m "Production build ready - Karobari hidden, Gujarati support added"
   git push origin main  # or your branch name
   ```

2. **Or manually trigger deployment**:
   - Go to Netlify dashboard → **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

---

## ✅ Step 4: Run Database Migrations

After the first successful build, you need to run Prisma migrations:

### Option A: Using Netlify Functions (Recommended)

Create a one-time migration function or use Netlify's build command:

1. Add to your build command in Netlify:
   ```
   npm run build && npx prisma migrate deploy
   ```

### Option B: Manual Migration via Database

Connect to your PostgreSQL database and run:
```sql
-- Check if tables exist, if not, run:
npx prisma migrate deploy
```

### Option C: Using Prisma Studio (Local)

1. Set `DATABASE_URL` in your local `.env` to point to production database
2. Run: `npx prisma migrate deploy`
3. **⚠️ Be very careful** - this will modify your production database

---

## ✅ Step 5: Verify Deployment

### Check Build Logs

1. Go to Netlify dashboard → **Deploys** tab
2. Click on the latest deploy
3. Check for any errors or warnings
4. Build should complete successfully

### Test Your Site

Visit your Netlify URL: `https://your-site-name.netlify.app`

**Test these critical features:**

1. **Landing Page**
   - ✅ Should load without errors
   - ✅ Should show "To be announced..." for election date
   - ✅ Should show "Overseas" for coverage
   - ✅ Sidebar should NOT show "Karobari Members"

2. **Admin Login**
   - ✅ Go to `/admin/login`
   - ✅ Login with admin credentials
   - ✅ Dashboard should NOT show Karobari sections

3. **Voter Login**
   - ✅ Go to `/voter/login`
   - ✅ Enter phone number and click "Send OTP"
   - ✅ Receive SMS with OTP code
   - ✅ Enter OTP and verify login
   - ✅ Dashboard should NOT show Karobari election

4. **File Upload**
   - ✅ Test document upload (if applicable)
   - ✅ Verify files are stored in Storj

5. **API Health Check**
   - ✅ Visit `/api/health`
   - ✅ Should return healthy status

---

## ✅ Step 6: Post-Deployment Tasks

### Set Up Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Add your custom domain
3. Configure DNS as instructed by Netlify

### Enable HTTPS

Netlify automatically provides HTTPS certificates. Verify it's enabled:
- **Site settings** → **HTTPS** → Should show "Certificate provisioned"

### Configure Redirects (if needed)

If you need custom redirects, add them to `netlify.toml` or Netlify dashboard.

---

## 🚨 Troubleshooting

### Build Fails

**Error: "Cannot find module '@prisma/client'"**
- Solution: Ensure `prisma generate` runs during build
- Check that `postinstall` script in `package.json` includes it

**Error: "Database connection failed"**
- Solution: Verify `DATABASE_URL` is set correctly in Netlify environment variables
- Check database allows connections from Netlify IPs
- Ensure SSL mode is correct: `?sslmode=require`

**Error: "Function size too large"**
- Solution: The `netlify.toml` already configures external packages
- Check build logs for specific large dependencies

### Runtime Errors

**Error: "JWT_SECRET is not defined"**
- Solution: Add all required environment variables in Netlify dashboard

**Error: "File upload fails"**
- Solution: Verify Storj credentials are correct
- Check Storj bucket exists and is accessible

**Error: "Karobari data still showing"**
- Solution: Clear browser cache
- Verify latest code is deployed (check Git commit in Netlify)

---

## 📊 Monitoring

### Check Function Logs

1. Go to **Functions** tab in Netlify dashboard
2. Monitor API route executions
3. Check for any errors

### Monitor Builds

- Set up build notifications (email/Slack)
- Monitor build times and success rates

---

## ✅ Success Checklist

- [ ] All environment variables set in Netlify
- [ ] First deployment completed successfully
- [ ] Database migrations run
- [ ] Landing page loads correctly
- [ ] Admin login works
- [ ] Voter login works (SMS OTP received and verified)
- [ ] Twilio SMS configuration added to Netlify environment variables
- [ ] Karobari sections are hidden
- [ ] Gujarati language toggle works
- [ ] File uploads work (if applicable)
- [ ] Health check endpoint returns success
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled

---

## 🎉 You're Ready!

Once all checkboxes are complete, your production site is live and ready for use!

**Next Actions:**
1. Test all user flows thoroughly
2. Monitor for any errors in the first 24 hours
3. Set up error tracking (optional but recommended)
4. Configure backups for your database

---

## 📞 Support

If you encounter issues:
1. Check Netlify build/deploy logs
2. Check function logs for API errors
3. Verify all environment variables are set
4. Test locally first before deploying changes

