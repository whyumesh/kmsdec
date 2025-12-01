# How to Get Your Storj Credentials (Step-by-Step)

This guide will help you retrieve your Storj access credentials to recover all your documents.

## Prerequisites
1. Your Storj account must be **reactivated/active**
2. You should have access to your Storj dashboard
3. Browser ready to navigate Storj portal

## Step-by-Step Instructions

### Step 1: Log into Storj Dashboard

1. Go to **https://us1.storj.io/signin** (or your region's Storj portal)
2. Log in with your Storj account credentials
3. If your account was expired, you may need to reactivate it first (update payment method, etc.)

### Step 2: Navigate to Access Management

1. Once logged in, look for **"Access Management"** or **"Access Grants"** in the left sidebar
2. Click on **"Access Grants"** or **"Access"** section
3. You should see a list of existing access grants (if you had any) or an empty list

### Step 3: Create or Use Existing Access Grant

#### Option A: If You Have an Existing Access Grant

1. Look for your previous access grant (it may still exist)
2. Click on the access grant name
3. Check if it has **S3 Credentials** - if yes, go to Step 4
4. If it doesn't have S3 credentials, you may need to create a new one (see Option B)

#### Option B: Create a New Access Grant (Recommended)

1. Click **"Create Access Grant"** or **"+"** button
2. Give it a name: `kms-election-access` (or any name you prefer)
3. Set permissions:
   - **Type**: Choose **"Access"** or **"Full Access"**
   - **Permissions**: Select **"All operations"** or ensure **Read** and **Write** are enabled
4. Click **"Create"** or **"Save"**

### Step 4: Generate S3 Credentials

1. Once you have an access grant selected, look for **"S3 Credentials"** or **"Generate S3 Credentials"** button
2. Click **"Generate S3 Credentials"** or **"Create S3 Credentials"**
3. You will see:
   - **Access Key ID** - This is your `STORJ_ACCESS_KEY_ID`
   - **Secret Access Key** - This is your `STORJ_SECRET_ACCESS_KEY`
   - **Endpoint** - Usually `https://gateway.storjshare.io` (this is your `STORJ_ENDPOINT`)
4. **IMPORTANT**: Copy both keys immediately - the Secret Access Key is only shown once!

### Step 5: Get Your Bucket Name

1. Go to **"Buckets"** or **"Storage"** section in Storj dashboard
2. Look for your bucket named `kms-election-files` (or whatever name you used)
3. If the bucket doesn't exist:
   - Click **"Create Bucket"**
   - Name it: `kms-election-files`
   - Make sure it's in the same project as your access grant
4. Note the exact bucket name - this is your `STORJ_BUCKET_NAME`

### Step 6: Get Region Information

1. In your Storj dashboard, check your project settings
2. Look for **"Region"** or **"Location"**
3. Common regions:
   - `us-east-1` (US East)
   - `eu-west-1` (Europe West)
   - `ap-southeast-1` (Asia Pacific)
4. If unsure, use `us-east-1` as default - this is your `STORJ_REGION`

### Step 7: Verify Your Bucket Has Files

1. Go to your bucket (`kms-election-files`)
2. Click on it to open
3. Look for folders starting with `nominations/`
4. You should see your uploaded documents here
5. If you see files, **great!** - all documents are recoverable
6. If bucket is empty, your files might be in a different bucket (check other buckets)

## Complete Credential Information

Once you have all the information, here's what your `.env.local` or environment variables should look like:

```bash
# Storj DCS Configuration (REQUIRED)
STORJ_ACCESS_KEY_ID=jwa8x...your_actual_access_key...xyz
STORJ_SECRET_ACCESS_KEY=jws8x...your_actual_secret_key...abc
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=us-east-1
STORJ_BUCKET_NAME=kms-election-files
```

## Alternative: Using Storj CLI (Advanced)

If you prefer command-line interface:

1. **Install Storj CLI**:
   ```bash
   npm install -g @storj/cli
   ```

2. **Login**:
   ```bash
   storj login
   ```

3. **Create Access Grant**:
   ```bash
   storj access create "kms-election-access" --s3
   ```

4. **Export Credentials**:
   ```bash
   storj access export "kms-election-access"
   ```
   This will show your S3 credentials in the format:
   ```
   Access Key ID: jwa8x...
   Secret Access Key: jws8x...
   Endpoint: https://gateway.storjshare.io
   ```

## Troubleshooting

### I Can't Find My Access Grant
- **Solution**: Create a new access grant with full permissions
- Make sure it's linked to the same project where your bucket exists

### My Bucket is Empty
- **Possible causes**:
  1. Files were in a different bucket (check all buckets)
  2. Files were deleted manually
  3. Different project/account was used
  
- **Solution**: 
  1. Check all buckets in your account
  2. Look for buckets with `nominations/` folders
  3. If found in different bucket, update `STORJ_BUCKET_NAME`

### Access Denied Errors
- **Solution**: 
  1. Ensure access grant has **"Full Access"** or **"All operations"** permission
  2. Recreate access grant if necessary
  3. Make sure access grant is linked to the correct project

### Different Endpoint URL
- Storj uses different endpoints by region
- Most common: `https://gateway.storjshare.io`
- Check your Storj dashboard for the correct endpoint for your region

## After Setting Up Credentials

1. **Restart your server**:
   ```bash
   npm run dev
   ```

2. **Verify connection**:
   Visit: `http://localhost:3000/api/upload/diagnostic`
   Should show: `"status": "success"`

3. **Verify documents**:
   Visit: `http://localhost:3000/api/admin/verify-storj-documents`
   This will show:
   - How many files are in Storj
   - How many match your database
   - Which files are recoverable

4. **Test document preview**:
   - Go to admin panel
   - Try previewing a candidate document
   - Should work now!

## Security Reminders

⚠️ **Important**:
- Never share your Secret Access Key
- Never commit credentials to Git
- Rotate keys periodically
- Store credentials securely (use environment variables only)

## Still Having Issues?

If you're still unable to retrieve your credentials or access files:

1. **Contact Storj Support**: https://support.storj.io
   - They can help verify your account status
   - They can confirm if your data is still accessible

2. **Check Account Status**:
   - Verify account is fully reactivated
   - Check billing/payment status
   - Ensure no account restrictions

3. **Alternative Recovery**:
   - Check database for base64 backups (`uploaded_files` table)
   - Check local `./uploads/` directory
   - Check if Cloudinary was used (previous fallback)

