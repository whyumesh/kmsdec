# Cloud Storage Setup Guide

## Overview
This application now uses a robust cloud storage system that automatically falls back to local storage if cloud credentials are not configured.

## Storage Options

### 1. AWS S3 (Recommended)
AWS S3 provides reliable, scalable, and secure cloud storage for documents.

#### Setup Steps:
1. **Create AWS Account**: Sign up at https://aws.amazon.com
2. **Create S3 Bucket**: 
   - Go to AWS S3 Console
   - Create a new bucket named `kms-election-documents`
   - Enable versioning and encryption
3. **Create IAM User**:
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. **Get Credentials**:
   - Copy Access Key ID and Secret Access Key
   - Update `.env.local` file:

```env
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=kms-election-documents
```

### 2. Storj DCS (Alternative)
Storj provides decentralized cloud storage with S3-compatible API.

#### Setup Steps:
1. **Create Storj Account**: Sign up at https://storj.io
2. **Create Access Grant**: Generate access credentials
3. **Update Environment Variables**:

```env
STORJ_ACCESS_KEY_ID=your_storj_access_key
STORJ_SECRET_ACCESS_KEY=your_storj_secret_key
STORJ_ENDPOINT=https://gateway.storjshare.io
STORJ_REGION=us-east-1
STORJ_BUCKET_NAME=kms-election-documents
```

### 3. Local Storage (Development)
If no cloud credentials are provided, the system automatically uses local storage in the `./uploads` directory.

## Features

### ✅ **Robust Storage**
- **Automatic Fallback**: Cloud → Local storage
- **File Validation**: Size limits (10MB), type checking
- **Secure URLs**: Pre-signed URLs with expiration
- **Error Handling**: Comprehensive error management

### ✅ **File Management**
- **Organized Structure**: `nominations/{candidateId}/{fileType}_{timestamp}_{randomId}.{ext}`
- **Multiple Formats**: PDF, JPG, PNG, WebP support
- **Metadata**: Upload timestamp, admin tracking
- **Preview Support**: Direct file viewing in browser

### ✅ **Security**
- **Access Control**: Admin-only document access
- **URL Expiration**: Download links expire after 1 hour
- **File Validation**: Prevents malicious uploads
- **Path Sanitization**: Prevents directory traversal

## Usage

### Upload Documents
```javascript
// Files are automatically uploaded to cloud storage
const formData = new FormData()
formData.append('candidateAadhaar', aadhaarFile)
formData.append('candidatePhoto', photoFile)
formData.append('proposerAadhaar', proposerFile)

const response = await fetch('/api/admin/yuva-pank-nominations/{id}/upload-documents', {
  method: 'POST',
  body: formData
})
```

### View Documents
```javascript
// Generate secure download URL
const response = await fetch('/api/admin/view-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileKey: 'nominations/123/aadhaar_1234567890_abc123.pdf' })
})

const { downloadUrl } = await response.json()
// Use downloadUrl to display/preview the document
```

## Benefits

### 🌐 **Cloud Storage Advantages**
- **Reliability**: 99.999999999% (11 9's) durability
- **Scalability**: Handle unlimited documents
- **Performance**: Global CDN distribution
- **Backup**: Automatic redundancy and versioning
- **Security**: Enterprise-grade encryption

### 📱 **User Experience**
- **Fast Uploads**: Optimized for large files
- **Instant Preview**: Direct browser viewing
- **Mobile Friendly**: Works on all devices
- **Progress Tracking**: Real-time upload progress

### 🔧 **Developer Benefits**
- **Zero Maintenance**: No server storage management
- **Cost Effective**: Pay only for what you use
- **API Integration**: Simple REST API calls
- **Monitoring**: Built-in analytics and logging

## Cost Estimation

### AWS S3 Pricing (US East)
- **Storage**: $0.023 per GB per month
- **Requests**: $0.0004 per 1,000 PUT requests
- **Data Transfer**: $0.09 per GB (first 1GB free)

### Example for 1,000 candidates with 3 documents each:
- **Storage**: ~3GB = $0.07/month
- **Uploads**: 3,000 requests = $0.0012
- **Downloads**: 10,000 requests = $0.004
- **Total**: ~$0.08/month

## Migration

### From Local to Cloud
1. Configure cloud credentials in `.env.local`
2. Restart the application
3. New uploads will automatically use cloud storage
4. Existing local files remain accessible

### Backup Strategy
- **Cloud Storage**: Built-in redundancy
- **Local Backup**: Regular exports to local storage
- **Database**: File metadata stored in PostgreSQL

## Troubleshooting

### Common Issues
1. **Upload Fails**: Check cloud credentials and permissions
2. **Preview Not Working**: Verify file exists and URL is valid
3. **Slow Performance**: Check network connection and region settings

### Debug Mode
Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will show detailed storage operation logs in the console.
