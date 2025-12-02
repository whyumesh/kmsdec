# Netlify Environment Variables - Complete Checklist

## 🔴 CRITICAL - Required for Application to Run

These MUST be set in Netlify Dashboard → Site settings → Environment variables:

### Database (REQUIRED)
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```
- **Required for**: All database operations
- **Error if missing**: "DATABASE_URL environment variable is required"
- **Note**: Must include `?sslmode=require` for most cloud databases

### Security Secrets (REQUIRED)
```
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
CSRF_SECRET=your-super-secure-csrf-secret-key-minimum-32-characters-long
NEXTAUTH_SECRET=your-nextauth-secret-key-minimum-32-characters-long
```
- **Required for**: Authentication, session management, security
- **Error if missing**: Authentication failures, security errors
- **Important**: Use strong, random strings (minimum 32 characters)

### NextAuth Configuration (REQUIRED)
```
NEXTAUTH_URL=https://your-site-name.netlify.app
```
- **Required for**: NextAuth authentication
- **Error if missing**: Authentication redirects won't work
- **Note**: Replace with your actual Netlify site URL

### Node Environment (REQUIRED)
```
NODE_ENV=production
```
- **Required for**: Production optimizations
- **Error if missing**: May cause development mode issues

---

## 🟡 IMPORTANT - Required for Core Features

### Twilio SMS Configuration (REQUIRED for OTP)
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```
- **Required for**: SMS OTP sending
- **Error if missing**: OTP won't be sent via SMS (will fallback to console logging)
- **Get from**: https://console.twilio.com/

### Email Configuration (REQUIRED for Email OTP)
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```
- **Required for**: Email OTP sending (overseas members)
- **Error if missing**: Email OTP won't work
- **Note**: Use Gmail App Password, not regular password

---

## 🟢 OPTIONAL - For File Storage

### Storj DCS Configuration (Optional - for file uploads)
```
STORJ_ACCESS_KEY_ID=your-storj-access-key-id
STORJ_SECRET_ACCESS_KEY=your-storj-secret-access-key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=global
STORJ_BUCKET_NAME=kmselection
```
- **Required for**: File uploads to Storj
- **Error if missing**: File uploads will fail (may fallback to local storage)
- **Note**: Application will work without these, but file uploads won't work

---

## 🔵 OPTIONAL - Performance & Configuration

### Security Settings (Optional but Recommended)
```
BCRYPT_ROUNDS=12
```
- **Default**: 12 if not set
- **Purpose**: Password hashing strength

### File Upload Settings (Optional)
```
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```
- **Default**: Built-in defaults if not set
- **Purpose**: File upload validation

### Admin Credentials (Optional - for admin login)
```
ADMIN_EMAIL=admin@kms-election.com
ADMIN_PASSWORD=SecureAdmin123!
ADMIN_PHONE=+1234567890
```
- **Note**: These are hardcoded in the code, but you can override with env vars
- **Security**: Change these in production!

---

## 📋 Quick Setup Instructions

1. **Go to Netlify Dashboard**
   - Navigate to: **Site settings** → **Environment variables**

2. **Add Each Variable**
   - Click **Add variable**
   - Enter variable name (e.g., `DATABASE_URL`)
   - Enter variable value (e.g., `postgresql://...`)
   - Click **Save**

3. **Verify All Variables**
   - Check that all CRITICAL variables are set
   - Ensure no typos in variable names
   - Verify values are correct

4. **Redeploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Or push a new commit to trigger automatic deployment

---

## 🚨 Common Deployment Errors & Fixes

### Error: "DATABASE_URL environment variable is required"
**Fix**: Add `DATABASE_URL` in Netlify environment variables

### Error: "JWT_SECRET is not defined"
**Fix**: Add `JWT_SECRET`, `CSRF_SECRET`, and `NEXTAUTH_SECRET` in Netlify

### Error: "OTP not being sent"
**Fix**: Add Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)

### Error: "Email OTP not working"
**Fix**: Add Gmail credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)

### Error: "File uploads failing"
**Fix**: Add Storj credentials (all 5 Storj variables)

### Error: "Authentication redirects not working"
**Fix**: Set `NEXTAUTH_URL` to your actual Netlify site URL

---

## ✅ Verification Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` set and tested
- [ ] `JWT_SECRET` set (32+ characters)
- [ ] `CSRF_SECRET` set (32+ characters)
- [ ] `NEXTAUTH_SECRET` set (32+ characters)
- [ ] `NEXTAUTH_URL` set to your Netlify URL
- [ ] `NODE_ENV=production` set
- [ ] `TWILIO_ACCOUNT_SID` set (if using SMS)
- [ ] `TWILIO_AUTH_TOKEN` set (if using SMS)
- [ ] `TWILIO_PHONE_NUMBER` set (if using SMS)
- [ ] `GMAIL_USER` set (if using email OTP)
- [ ] `GMAIL_APP_PASSWORD` set (if using email OTP)
- [ ] Storj credentials set (if using file uploads)

---

## 🔍 How to Test Environment Variables

After setting variables, test by:

1. **Check Build Logs**
   - Go to Netlify → Deploys → Latest deploy → Build log
   - Look for any environment variable errors

2. **Test API Endpoints**
   - Visit: `https://your-site.netlify.app/api/health`
   - Should return healthy status

3. **Test Voter Login**
   - Go to: `https://your-site.netlify.app/voter/login`
   - Try sending OTP (should work if Twilio is configured)

4. **Check Function Logs**
   - Go to Netlify → Functions tab
   - Check for any runtime errors related to missing env vars

---

## 📝 Notes

- **Variable Names**: Must match exactly (case-sensitive)
- **No Quotes**: Don't wrap values in quotes unless the value itself contains quotes
- **Special Characters**: URL-encode special characters in `DATABASE_URL`
- **Secrets**: Never commit these to Git - always use Netlify environment variables
- **Updates**: After adding/updating variables, you need to redeploy

---

## 🆘 Still Having Issues?

If deployment still fails after setting all variables:

1. **Check Netlify Function Logs**
   - Go to: Netlify Dashboard → Functions → View logs
   - Look for specific error messages

2. **Test Locally**
   - Copy all env vars to local `.env.local`
   - Run `npm run build` locally
   - Check for any build errors

3. **Verify Database Connection**
   - Ensure database allows connections from Netlify IPs
   - Check database firewall settings
   - Verify SSL is enabled (`?sslmode=require`)

4. **Check Prisma Client Generation**
   - Ensure `prisma generate` runs during build
   - Check `package.json` has `postinstall` script

