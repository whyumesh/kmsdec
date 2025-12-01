# 🚀 Production Deployment Guide

This guide will help you deploy the KMS Election System to production.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase, Railway, or self-hosted)
- Domain name and hosting platform
- Email service (Gmail, SendGrid, etc.)
- File storage (Storj, AWS S3, or local storage)

## 🔧 Environment Setup

### 1. Copy Environment Template
```bash
cp env.production.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local` with your production values:

#### Database Configuration
```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

#### Security (CRITICAL - Use Strong Secrets)
```env
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secure-nextauth-secret-key-min-32-chars"
JWT_SECRET="your-super-secure-jwt-secret-key-min-32-chars"
CSRF_SECRET="your-super-secure-csrf-secret-key-min-32-chars"
```

#### Admin Credentials (CHANGE THESE)
```env
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="YourSecureAdminPassword123!"
ADMIN_PHONE="+1234567890"
```

#### File Storage (Optional - will fallback to local)
```env
STORJ_ACCESS_KEY_ID="your-storj-access-key"
STORJ_SECRET_ACCESS_KEY="your-storj-secret-key"
STORJ_BUCKET_NAME="your-bucket-name"
```

#### Email Configuration
```env
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"
```

## 🏗️ Build Process

### Option 1: Using Build Script (Recommended)
```bash
# Windows
scripts\build-production.bat

# Linux/Mac
./scripts/build-production.sh
```

### Option 2: Manual Build
```bash
# Install dependencies
npm ci --prefer-offline --no-audit

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build:prod
```

## 🚀 Deployment Options

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   # Install dependencies
   COPY package.json package-lock.json* ./
   RUN npm ci --only=production
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   # Generate Prisma client
   RUN npx prisma generate
   
   # Build the application
   RUN npm run build:prod
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t kms-election .
   docker run -p 3000:3000 --env-file .env.local kms-election
   ```

## 🗄️ Database Setup

### Supabase (Recommended)
1. Create a new Supabase project
2. Get your database URL from Settings → Database
3. Update `DATABASE_URL` in your environment variables
4. Run migrations: `npx prisma db push`

### Railway
1. Create a new Railway project
2. Add PostgreSQL service
3. Get connection string from Variables tab
4. Update `DATABASE_URL` in your environment variables

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password
3. Use your Gmail address and app password in environment variables

### SendGrid Setup
1. Create SendGrid account
2. Generate API key
3. Update email configuration in your code

## 🔒 Security Checklist

- [ ] Strong secrets (32+ characters)
- [ ] HTTPS enabled
- [ ] Admin credentials changed
- [ ] Database credentials secure
- [ ] File upload restrictions in place
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security headers configured

## 🧪 Testing

### Pre-deployment Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Test build
npm run build:prod

# Test production start
npm run start:prod
```

### Post-deployment Testing
1. Test user registration
2. Test candidate nomination
3. Test file uploads
4. Test admin functions
5. Test voting system
6. Test email notifications

## 📊 Monitoring

### Health Check Endpoints
- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed system status

### Logs
- Monitor application logs
- Set up error tracking (Sentry, etc.)
- Monitor database performance

## 🔄 Maintenance

### Database Backups
```bash
npm run db:backup
```

### Database Cleanup
```bash
npm run db:cleanup
```

### Health Monitoring
```bash
npm run db:health
```

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Check environment variables

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database credentials
   - Ensure database is accessible

3. **File Upload Issues**
   - Check file storage configuration
   - Verify file size limits
   - Check upload directory permissions

4. **Email Issues**
   - Verify email credentials
   - Check SMTP settings
   - Test with simple email first

### Support
- Check application logs
- Monitor error tracking
- Review health check endpoints

## 📈 Performance Optimization

### Production Optimizations Already Applied
- ✅ SWC minification enabled
- ✅ Tree shaking enabled
- ✅ Image optimization
- ✅ Compression enabled
- ✅ Security headers
- ✅ Bundle optimization
- ✅ Static file caching

### Additional Optimizations
- Use CDN for static assets
- Enable database connection pooling
- Implement Redis caching
- Use image optimization services

---

## 🎉 Deployment Complete!

Your KMS Election System is now ready for production use. Make sure to:

1. Test all functionality thoroughly
2. Monitor system performance
3. Set up regular backups
4. Keep dependencies updated
5. Monitor security updates

For support, check the logs and health endpoints first, then review the troubleshooting section.
