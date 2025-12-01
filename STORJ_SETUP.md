# Storj Storage Setup Guide

## Overview
This application uses **Storj DCS (Decentralized Cloud Storage)** as the primary and only storage solution for uploaded documents.

## Prerequisites
1. A Storj account ([storj.io](https://www.storj.io))
2. Access keys for Storj DCS

## Setup Steps

### 1. Create a Storj Account
1. Go to [storj.io](https://www.storj.io)
2. Sign up for an account
3. Complete the verification process

### 2. Create Access Credentials
1. Log into your Storj account
2. Navigate to **Access Management** → **Create Access Grant**
3. Create a new access grant with the following permissions:
   - **Full access** to buckets (for uploads)
   - **Read access** for downloads
4. Generate **S3 Credentials**
5. Save the following information:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint URL** (usually `https://gateway.storjshare.io`)
   - **Bucket Name** (create a bucket if you haven't already)

### 3. Create a Bucket
1. In Storj, create a bucket named `kms-election-files` (or use your preferred name)
2. Note the bucket name for use in environment variables

### 4. Configure Environment Variables
Add these variables to your `.env.local` file (development) or hosting platform (production):

```bash
# Storj Configuration (REQUIRED)
STORJ_ACCESS_KEY_ID=your_access_key_id_here
STORJ_SECRET_ACCESS_KEY=your_secret_access_key_here
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=us-east-1
STORJ_BUCKET_NAME=kms-election-files
```

### 5. Verify Configuration
After setting up the environment variables:
1. Restart your development server or redeploy
2. Try uploading a document through the nomination form
3. Check that files appear in your Storj bucket

## Troubleshooting

### Error: "Storj storage is not configured"
**Solution:** Make sure you've set both `STORJ_ACCESS_KEY_ID` and `STORJ_SECRET_ACCESS_KEY` in your environment variables.

### Error: "Failed to generate upload URL"
**Possible causes:**
- Invalid credentials
- Network connectivity issues
- Bucket doesn't exist
- Insufficient permissions

**Solution:**
1. Verify your credentials are correct
2. Check that the bucket exists in Storj
3. Ensure your access grant has proper permissions

### Previously Uploaded Documents Not Visible
If you have documents uploaded before Storj was configured, they may be stored in:
- Local file system (`./uploads/` directory)
- Database (base64 encoded)
- Cloudinary (if previously configured)

These legacy files will still be accessible through the admin panel, but new uploads require Storj.

## Account Expiration & Data Recovery

### ⚠️ Important: Data Persistence After Trial Expiration

**Good News:** Storj DCS stores your data in a decentralized network, which means your files are **NOT deleted** when your trial expires. The data remains stored and accessible once you reactivate your account.

### What Happens When Your Trial Expires?

1. **Data Preservation**: All your uploaded files remain in Storj storage
2. **Access Restriction**: You cannot access/download files while account is inactive
3. **No Data Loss**: Files are preserved for a reasonable period (check Storj's retention policy)

### After Reactivating Your Account

Once you reactivate your Storj account and update your credentials:

1. **Verify Document Recovery**: 
   - Visit `/api/admin/verify-storj-documents` to check if all files are accessible
   - This endpoint will:
     - List all files in your Storj bucket
     - Cross-reference with your database records
     - Show which files are recoverable and which might be missing

2. **Expected Results**:
   - ✅ Most files should be immediately accessible
   - ✅ Document previews should work again
   - ⚠️ If some files show as missing, they may have been:
     - Deleted manually from Storj dashboard
     - Lost due to extended account inactivity (rare)
     - Moved to a different bucket

3. **If Files Are Missing**:
   - Check your database for base64 backups (in `uploaded_files` table)
   - Check local `./uploads/` directory for local backups
   - Contact Storj support if files were critical

### Verification Endpoint

After reactivating, use this endpoint to verify your documents:

```
GET /api/admin/verify-storj-documents
```

This will return:
- Total files in Storj bucket
- Database records referencing Storj files
- Matched files (accessible)
- Missing files (if any)
- Orphaned files (in Storj but not in database)

## Security Best Practices
1. **Never commit** your Storj credentials to version control
2. Use **environment variables** for all credentials
3. Rotate credentials periodically
4. Use **read-only** access grants where possible for download operations

## Storage Costs
Storj offers:
- **Free tier:** 25 GB storage + 25 GB egress per month
- **Paid plans:** Very affordable pricing for additional storage

Check [storj.io/pricing](https://www.storj.io/pricing) for current pricing.

## Quick Start: Getting Your Credentials

If you need to retrieve your Storj credentials (especially after account reactivation), see **`STORJ_CREDENTIALS_GUIDE.md`** for detailed step-by-step instructions.

**Quick Steps:**
1. Log into Storj dashboard at https://us1.storj.io/signin
2. Go to **Access Management** → **Access Grants**
3. Create or select an access grant
4. Generate **S3 Credentials**
5. Copy: Access Key ID, Secret Access Key, Endpoint
6. Check **Buckets** section for your bucket name
7. Add all to your `.env.local` file

## Support
If you encounter issues:
1. Check the application logs for detailed error messages
2. Verify your Storj account status
3. Ensure network connectivity to Storj endpoints
4. See `STORJ_CREDENTIALS_GUIDE.md` for credential retrieval help
5. Contact Storj support at https://support.storj.io if issues persist

