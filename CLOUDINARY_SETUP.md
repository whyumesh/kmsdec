# Cloudinary Setup Guide

## 🚀 Quick Setup (2 minutes)

### 1. Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up For Free"
3. Complete registration (completely free)

### 2. Get Your Credentials
1. After login, go to **Dashboard**
2. Copy these 3 values:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Update Environment Variables
Add these to your `.env.local` file:

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name-here"
CLOUDINARY_API_KEY="your-api-key-here"
CLOUDINARY_API_SECRET="your-api-secret-here"
```

### 4. Deploy
That's it! Your app will now use Cloudinary for all file storage.

## ✅ Benefits

- **25GB FREE storage** (huge!)
- **25GB FREE bandwidth/month**
- **Global CDN** (fast worldwide)
- **Automatic image optimization**
- **99.9% uptime SLA**
- **No complex setup**

## 🔧 For Production Deployment

When deploying to your hosting platform (Railway, Render, Docker, etc.), add these same environment variables in your deployment platform's settings.

## 📁 File Structure

Files will be stored in Cloudinary with this structure:
```
kms-election/
├── nominations/
│   ├── candidate_123/
│   │   ├── aadhaar_1234567890_abc123.jpg
│   │   ├── photo_1234567890_def456.jpg
│   │   └── proposer_aadhaar_1234567890_ghi789.jpg
```

## 🆘 Troubleshooting

If you see "Cloudinary not configured" in logs:
1. Check your environment variables are set correctly
2. Verify credentials in Cloudinary dashboard
3. Restart your development server

## 💡 Pro Tips

- Files are automatically optimized for web delivery
- Images are served via global CDN
- No need to manage file cleanup
- Automatic format conversion (WebP, AVIF)
