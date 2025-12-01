# Production Configuration Guide

## Environment Variables Setup

Create a `.env.production` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-secret-key-here

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_S8lUFoJtxCj6@ep-dry-paper-a1fgokjj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Cloudinary Configuration (FREE: 25GB storage, 25GB bandwidth/month)
CLOUDINARY_CLOUD_NAME=degpmxhsm
CLOUDINARY_API_KEY=888257346782715
CLOUDINARY_API_SECRET=-IiqzjQ7cAtfyGLddfX8eri36Zk

# Security Configuration
JWT_SECRET=your-jwt-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20

# File Upload Configuration
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_DIR=./uploads

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=./logs/application.log
ERROR_LOG_FILE=./logs/error.log

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=30000
PERFORMANCE_MONITORING=true
ERROR_REPORTING=true
```

## Production Deployment Steps

### 1. Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Cloudinary credentials verified
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Backup strategy implemented

### 2. Run Production Deployment
```bash
# Windows
deploy-production.bat

# Linux/Mac
./deploy-production.sh
```

### 3. Start Production Server
```bash
# Windows
start-production.bat

# Linux/Mac
./start-production.sh
```

### 4. Monitor System
```bash
# Windows
monitor.bat

# Linux/Mac
./monitor.sh
```

## Production Features

### ✅ Error Handling
- **Comprehensive Error Boundaries**: React error boundaries catch all client-side errors
- **Server Error Handling**: All API routes have try-catch blocks with logging
- **Database Resilience**: Automatic retry with exponential backoff
- **Cloudinary Fallback**: Automatic fallback to local storage if cloud fails

### ✅ Logging & Monitoring
- **Structured Logging**: JSON-formatted logs with context and request IDs
- **Error Tracking**: All errors logged with stack traces and context
- **Performance Monitoring**: Request timing and resource usage tracking
- **Health Checks**: Comprehensive health check endpoint at `/api/health`

### ✅ Security
- **Input Sanitization**: All user inputs sanitized and validated
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **CORS Protection**: Configured for production domains
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Headers**: Security headers for production

### ✅ Performance
- **Database Connection Pooling**: Optimized database connections
- **File Upload Optimization**: Efficient file handling and storage
- **Memory Management**: Automatic memory restart at 1GB
- **Cluster Mode**: Multi-process deployment for better performance

### ✅ Reliability
- **Graceful Shutdown**: Proper cleanup on server shutdown
- **Process Management**: PM2 for process monitoring and restart
- **Backup Strategy**: Automated database backups
- **Health Monitoring**: Continuous health checks and alerts

## Production Commands

### Deployment
```bash
npm run deploy:production    # Full production deployment
npm run build:production    # Build for production
npm run start:production     # Start production server
```

### Monitoring
```bash
npm run monitor             # System monitoring
npm run health              # Health check
npm run logs                # View logs
npm run status              # PM2 status
```

### Management
```bash
npm run restart             # Restart application
npm run stop                # Stop application
npm run db:health           # Database health check
npm run db:backup           # Database backup
```

## Production URLs

- **Application**: `https://your-domain.com`
- **Health Check**: `https://your-domain.com/api/health`
- **Admin Panel**: `https://your-domain.com/admin/login`
- **API Documentation**: `https://your-domain.com/api`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Verify Neon database is accessible
   - Check network connectivity

2. **Cloudinary Upload Failed**
   - Verify Cloudinary credentials
   - Check file size limits
   - Monitor Cloudinary dashboard

3. **Memory Issues**
   - Monitor memory usage with `npm run monitor`
   - Restart application if needed
   - Check for memory leaks

4. **Performance Issues**
   - Check database query performance
   - Monitor file upload sizes
   - Review error logs

### Emergency Procedures

1. **Application Down**
   ```bash
   npm run restart
   ```

2. **Database Issues**
   ```bash
   npm run db:health
   npm run db:backup
   ```

3. **File Upload Issues**
   - Check Cloudinary dashboard
   - Verify file permissions
   - Review upload logs

## Support

For production issues:
1. Check logs: `npm run logs`
2. Run health check: `npm run health`
3. Monitor system: `npm run monitor`
4. Review error logs in `./logs/error.log`

## Security Notes

- Change all default passwords
- Use strong, unique secrets
- Enable SSL/TLS encryption
- Regular security updates
- Monitor access logs
- Implement backup verification
